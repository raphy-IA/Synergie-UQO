'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface ReunionFilters {
  type_reunion?: string;
  statut?: string;
  commission_id?: string;
  mes_convocations_uniquement?: boolean;
}

/**
 * Récupère la liste des réunions avec les détails sur l'organisateur, commission et comptage des présent/convoqués.
 */
export async function getReunionsList(filters?: ReunionFilters) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Get current user role and memberships for strict filtering
  const { data: userProf } = await supabase
    .from('profiles')
    .select('id, role, poste_association, commission_membres(commission_id, role_commission)')
    .eq('id', user.id)
    .single();

  const roleSys = userProf?.role || '';
  const isBureau = ['admin_ca', 'tresorier', 'superadmin'].includes(roleSys);

  let query = supabase
    .from('reunions')
    .select(`
      *,
      organisateur:profiles!reunions_organisateur_id_fkey(id, prenom, nom, email, avatar_url, role),
      commission:commissions(id, nom, sigle),
      presences:reunion_presences(id, profile_id, statut, motif_absence),
      pv:reunion_pvs(id, valide_par_bureau, created_at)
    `)
    .order('date_debut', { ascending: false });

  if (filters?.type_reunion && filters.type_reunion !== 'tous') {
    query = query.eq('type_reunion', filters.type_reunion);
  }

  if (filters?.statut && filters.statut !== 'tous') {
    query = query.eq('statut', filters.statut);
  }

  if (filters?.commission_id) {
    query = query.eq('commission_id', filters.commission_id);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Erreur getReunionsList:', error);
    return [];
  }

  let result = data || [];

  // FILTER FOR CONFIDENTIALITY: If not bureau member, only see meetings where summoned, organizing, or member of the commission
  if (!isBureau) {
    const myCommIds = new Set((userProf?.commission_membres || []).map((cm: any) => cm.commission_id));
    result = result.filter(r => {
      const isOrganisateur = r.organisateur_id === user.id;
      const isSummoned = (r.presences || []).some((p: any) => p.profile_id === user.id);
      const isMyCommMeeting = r.type_reunion === 'commission' && r.commission_id && myCommIds.has(r.commission_id);
      return isOrganisateur || isSummoned || isMyCommMeeting;
    });
  }

  if (filters?.mes_convocations_uniquement && user) {
    result = result.filter(r => (r.presences || []).some((p: any) => p.profile_id === user.id));
  }

  return result;
}

/**
 * Récupère les détails complets d'une réunion (ODJ, Présences & PV) avec contrôle d'accès strict.
 */
export async function getReunionDetail(reunionId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: userProf } = await supabase
    .from('profiles')
    .select('id, role, commission_membres(commission_id)')
    .eq('id', user.id)
    .single();

  const roleSys = userProf?.role || '';
  const isBureau = ['admin_ca', 'tresorier', 'superadmin'].includes(roleSys);

  const { data: reunion, error } = await supabase
    .from('reunions')
    .select(`
      *,
      organisateur:profiles!reunions_organisateur_id_fkey(id, prenom, nom, email, avatar_url, role),
      commission:commissions(id, nom, sigle),
      odj:reunion_odj_items(*, intervenant:profiles(id, prenom, nom)),
      presences:reunion_presences(*, profile:profiles(id, prenom, nom, email, avatar_url, role)),
      pv:reunion_pvs(*, redacteur:profiles(id, prenom, nom)),
      taches:taches(*, assignations:tache_assignations(*, profile:profiles(id, prenom, nom)))
    `)
    .eq('id', reunionId)
    .single();

  if (error || !reunion) {
    console.error('Erreur getReunionDetail:', error);
    return null;
  }

  // CONFIDENTIALITY CHECK FOR DETAILS
  if (!isBureau) {
    const isOrganisateur = reunion.organisateur_id === user.id;
    const isSummoned = (reunion.presences || []).some((p: any) => p.profile_id === user.id);
    const myCommIds = new Set((userProf?.commission_membres || []).map((cm: any) => cm.commission_id));
    const isMyCommMeeting = reunion.type_reunion === 'commission' && reunion.commission_id && myCommIds.has(reunion.commission_id);

    if (!isOrganisateur && !isSummoned && !isMyCommMeeting) {
      console.error('Accès refusé à la réunion pour des raisons de confidentialité.');
      return null;
    }
  }

  // Trier les items ODJ par ordre
  if (reunion.odj) {
    reunion.odj.sort((a: any, b: any) => a.ordre - b.ordre);
  }

  return reunion;
}

/**
 * Récupère les profils théoriquement éligibles/convoqués par défaut selon le type de réunion choisi.
 */
export async function getEligibleMembersForReunion(type_reunion: string, commission_id?: string) {
  const supabase = createClient();

  if (type_reunion === 'bureau') {
    const { data } = await supabase
      .from('profiles')
      .select('id, prenom, nom, role, email, avatar_url, poste_association')
      .in('role', ['admin_ca', 'tresorier', 'superadmin'])
      .order('prenom');
    return data || [];
  }

  if (type_reunion === 'reunion_ca') {
    const { data } = await supabase
      .from('profiles')
      .select('id, prenom, nom, role, email, avatar_url, poste_association')
      .or('role.in.(admin_ca,superadmin,tresorier),poste_association.ilike.%ca%,poste_association.ilike.%conseil%')
      .order('prenom');
    return data || [];
  }

  if (type_reunion === 'president_commissions') {
    // Président + Responsables de commissions
    const { data: comms } = await supabase
      .from('commissions')
      .select('responsable_id');
    const respIds = (comms || []).map(c => c.responsable_id).filter(Boolean);

    const { data: bureauProfiles } = await supabase
      .from('profiles')
      .select('id, prenom, nom, role, email, avatar_url, poste_association')
      .or(`role.in.(admin_ca,superadmin,tresorier),id.in.(${respIds.length > 0 ? respIds.join(',') : '00000000-0000-0000-0000-000000000000'})`);
    
    return bureauProfiles || [];
  }

  if (type_reunion === 'commission' && commission_id) {
    const { data: cmList } = await supabase
      .from('commission_membres')
      .select('profile_id, profiles(id, prenom, nom, email, avatar_url, role, poste_association)')
      .eq('commission_id', commission_id)
      .eq('actif', true);

    const members: any[] = [];
    (cmList || []).forEach((item: any) => {
      if (item.profiles) members.push(item.profiles);
    });
    return members;
  }

  // Fallback: Tous les membres actifs
  const { data: allData } = await supabase
    .from('profiles')
    .select('id, prenom, nom, role, email, avatar_url, poste_association')
    .eq('statut_adhesion', 'approuve')
    .order('prenom');

  return allData || [];
}

/**
 * Création d'une réunion de travail avec convocations initiales et vérification stricte des droits.
 */
export async function createReunion(payload: {
  titre: string;
  type_reunion: string;
  format_reunion?: string;
  lieu?: string;
  lien_visio?: string;
  date_debut: string;
  date_fin?: string;
  description?: string;
  commission_id?: string;
  convoques_ids?: string[]; // IDs des profils cochés
  odj_items?: { titre: string; description?: string; duree_minutes?: number }[];
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Non authentifié' };

  // Verification de sécurité selon le rôle du créateur
  const { data: userProf } = await supabase
    .from('profiles')
    .select('role, poste_association, commission_membres(commission_id, role_commission)')
    .eq('id', user.id)
    .single();

  const roleSys = userProf?.role || '';
  const isBureau = ['admin_ca', 'tresorier', 'superadmin'].includes(roleSys);
  const userCommMap = new Map((userProf?.commission_membres || []).map((cm: any) => [cm.commission_id, cm.role_commission]));

  if (payload.type_reunion === 'bureau' && !isBureau) {
    return { success: false, error: 'Accès refusé : Seuls les membres du Bureau Exécutif peuvent convoquer une réunion du Bureau.' };
  }

  if (payload.type_reunion === 'reunion_ca' && !isBureau) {
    return { success: false, error: 'Accès refusé : Seuls les membres du CA/Bureau peuvent convoquer une réunion du Conseil d\'Administration.' };
  }

  if (payload.type_reunion === 'president_commissions' && !isBureau) {
    return { success: false, error: 'Accès refusé : Seul le Présidence/Bureau peut convoquer la réunion Président & Responsables.' };
  }

  if (payload.type_reunion === 'commission') {
    if (!payload.commission_id) {
      return { success: false, error: 'Veuillez spécifier la commission concernée.' };
    }
    const roleInComm = userCommMap.get(payload.commission_id);
    const isCommLeader = roleInComm && ['president', 'responsable', 'vice_president'].includes(roleInComm.toLowerCase());

    if (!isBureau && !isCommLeader) {
      return { success: false, error: 'Accès refusé : Vous devez être responsable de cette commission ou membre du Bureau pour la convoquer.' };
    }
  }

  const { data: newReunion, error } = await supabase
    .from('reunions')
    .insert({
      titre: payload.titre,
      type_reunion: payload.type_reunion,
      format_reunion: payload.format_reunion || 'presentiel',
      lieu: payload.lieu,
      lien_visio: payload.lien_visio,
      date_debut: payload.date_debut,
      date_fin: payload.date_fin || null,
      description: payload.description,
      commission_id: payload.commission_id || null,
      organisateur_id: user.id,
      statut: 'convoquee',
    })
    .select()
    .single();

  if (error || !newReunion) {
    return { success: false, error: error?.message || 'Erreur de création de la réunion' };
  }

  // 1. Déterminer les personnes convoquées à partir des IDs cochés
  const convoqueSet = new Set<string>();
  if (payload.convoques_ids && payload.convoques_ids.length > 0) {
    payload.convoques_ids.forEach(id => convoqueSet.add(id));
  }
  convoqueSet.add(user.id); // L'organisateur est toujours présent/convoqué

  // 2. Insérer l'émargement / convocations
  const presencesPayload = Array.from(convoqueSet).map(profileId => ({
    reunion_id: newReunion.id,
    profile_id: profileId,
    statut: profileId === user.id ? 'present' : 'convoque',
  }));

  if (presencesPayload.length > 0) {
    await supabase.from('reunion_presences').insert(presencesPayload);
  }

  // 3. Insérer les items de l'ordre du jour si fournis
  if (payload.odj_items && payload.odj_items.length > 0) {
    const odjPayload = payload.odj_items.map((item, idx) => ({
      reunion_id: newReunion.id,
      ordre: idx + 1,
      titre: item.titre,
      description: item.description || null,
      duree_minutes: item.duree_minutes || 15,
    }));
    await supabase.from('reunion_odj_items').insert(odjPayload);
  }

  revalidatePath('/dashboard/reunions');
  return { success: true, reunionId: newReunion.id };
}

/**
 * Mise à jour du statut ou des détails d'une réunion.
 */
export async function updateReunion(reunionId: string, payload: any) {
  const supabase = createClient();
  const { error } = await supabase
    .from('reunions')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', reunionId);

  if (error) return { success: false, error: error.message };
  revalidatePath(`/dashboard/reunions/${reunionId}`);
  revalidatePath('/dashboard/reunions');
  return { success: true };
}

/**
 * Enregistrement ou RSVP d'un membre (Présent / Excusé avec motif)
 */
export async function updateMemberRSVP(payload: {
  reunionId: string;
  statut: 'present' | 'excuse' | 'absent';
  motifAbsence?: string;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Non authentifié' };

  const { error } = await supabase
    .from('reunion_presences')
    .upsert({
      reunion_id: payload.reunionId,
      profile_id: user.id,
      statut: payload.statut,
      motif_absence: payload.motifAbsence || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'reunion_id, profile_id' });

  if (error) return { success: false, error: error.message };
  revalidatePath(`/dashboard/reunions/${payload.reunionId}`);
  return { success: true };
}

/**
 * Mise à jour globale de l'émargement / présences par l'organisateur.
 */
export async function updateEmargement(reunionId: string, presences: { profile_id: string; statut: string; motif_absence?: string }[]) {
  const supabase = createClient();

  try {
    for (const item of presences) {
      const { error } = await supabase
        .from('reunion_presences')
        .upsert({
          reunion_id: reunionId,
          profile_id: item.profile_id,
          statut: item.statut,
          motif_absence: item.motif_absence || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'reunion_id, profile_id' });

      if (error) return { success: false, error: error.message };
    }

    revalidatePath(`/dashboard/reunions/${reunionId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erreur lors de l\'émargement' };
  }
}

/**
 * Sauvegarde de l'Ordre du Jour (ODJ)
 */
export async function saveReunionODJ(reunionId: string, odjItems: { id?: string; titre: string; description?: string; duree_minutes?: number; intervenant_id?: string }[]) {
  const supabase = createClient();

  // Supprimer et réinsérer pour maintenir l'ordre exact
  await supabase.from('reunion_odj_items').delete().eq('reunion_id', reunionId);

  if (odjItems.length > 0) {
    const payload = odjItems.map((item, idx) => ({
      reunion_id: reunionId,
      ordre: idx + 1,
      titre: item.titre,
      description: item.description || null,
      duree_minutes: item.duree_minutes || 15,
      intervenant_id: item.intervenant_id || null,
    }));

    const { error } = await supabase.from('reunion_odj_items').insert(payload);
    if (error) return { success: false, error: error.message };
  }

  revalidatePath(`/dashboard/reunions/${reunionId}`);
  return { success: true };
}

/**
 * Rédaction / Mise à jour du Procès-Verbal (PV) officiel
 */
export async function saveReunionPV(payload: {
  reunionId: string;
  compteRendu: string;
  documentUrl?: string;
  valideParBureau?: boolean;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('reunion_pvs')
    .upsert({
      reunion_id: payload.reunionId,
      compte_rendu: payload.compteRendu,
      document_url: payload.documentUrl || null,
      valide_par_bureau: payload.valideParBureau ?? false,
      redige_par: user?.id || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'reunion_id' });

  if (error) return { success: false, error: error.message };

  // Si le PV est validé, passer la réunion en "terminée"
  if (payload.valideParBureau) {
    await supabase.from('reunions').update({ statut: 'terminee' }).eq('id', payload.reunionId);
  }

  revalidatePath(`/dashboard/reunions/${payload.reunionId}`);
  return { success: true };
}
