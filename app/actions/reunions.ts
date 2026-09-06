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

  if (filters?.mes_convocations_uniquement && user) {
    result = result.filter(r => (r.presences || []).some((p: any) => p.profile_id === user.id));
  }

  return result;
}

/**
 * Récupère les détails complets d'une réunion (ODJ, Présences & PV)
 */
export async function getReunionDetail(reunionId: string) {
  const supabase = createClient();

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

  // Trier les items ODJ par ordre
  if (reunion.odj) {
    reunion.odj.sort((a: any, b: any) => a.ordre - b.ordre);
  }

  return reunion;
}

/**
 * Création d'une réunion de travail avec convocations initiales.
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
  convoques_ids?: string[]; // IDs des profils à convoquer
  bureau_complet?: boolean; // Vrai pour convoquer tout le bureau / staff
  odj_items?: { titre: string; description?: string; duree_minutes?: number }[];
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Non authentifié' };

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

  // 1. Déterminer les personnes à convoquer
  const convoqueSet = new Set<string>();
  if (payload.convoques_ids) {
    payload.convoques_ids.forEach(id => convoqueSet.add(id));
  }
  convoqueSet.add(user.id); // L'organisateur est toujours présent/convoqué

  if (payload.bureau_complet) {
    const { data: bureauProfiles } = await supabase
      .from('profiles')
      .select('id')
      .in('role', ['admin_ca', 'tresorier', 'superadmin']);
    (bureauProfiles || []).forEach(p => convoqueSet.add(p.id));
  }

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
