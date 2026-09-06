'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
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

  const supabaseAdmin = createAdminClient();

  // Get current user role and memberships for strict filtering
  const { data: userProf } = await supabaseAdmin
    .from('profiles')
    .select('id, role, poste_association, commission_membres(commission_id, role_commission)')
    .eq('id', user.id)
    .single();

  const roleSys = userProf?.role || '';
  const isBureau = ['admin_ca', 'tresorier', 'superadmin'].includes(roleSys);

  let query = supabaseAdmin
    .from('reunions')
    .select(`
      *,
      organisateur:profiles(id, prenom, nom, email, avatar_url, role),
      commission:commissions(id, nom),
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

  const supabaseAdmin = createAdminClient();

  const { data: userProf } = await supabaseAdmin
    .from('profiles')
    .select('id, role, commission_membres(commission_id)')
    .eq('id', user.id)
    .single();

  const roleSys = userProf?.role || '';
  const isBureau = ['admin_ca', 'tresorier', 'superadmin'].includes(roleSys);

  const { data: reunion, error } = await supabaseAdmin
    .from('reunions')
    .select(`
      *,
      organisateur:profiles(id, prenom, nom, email, avatar_url, role),
      commission:commissions(id, nom),
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
/**
 * Récupère les profils théoriquement éligibles/convoqués par défaut selon le type de réunion choisi.
 */
export async function getEligibleMembersForReunion(type_reunion: string, commission_id?: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const supabaseAdmin = createAdminClient();

  if (type_reunion === 'bureau') {
    const { data } = await supabaseAdmin
      .from('profiles')
      .select('id, prenom, nom, role, email, avatar_url, poste_association')
      .in('role', ['admin_ca', 'tresorier', 'superadmin'])
      .order('prenom');
    return data || [];
  }

  if (type_reunion === 'reunion_ca') {
    const { data } = await supabaseAdmin
      .from('profiles')
      .select('id, prenom, nom, role, email, avatar_url, poste_association')
      .or('role.in.(admin_ca,superadmin,tresorier),poste_association.ilike.%ca%,poste_association.ilike.%conseil%')
      .order('prenom');
    return data || [];
  }

  if (type_reunion === 'president_commissions') {
    // Président + Responsables de commissions
    const { data: comms } = await supabaseAdmin
      .from('commissions')
      .select('responsable_id');
    const respIds = (comms || []).map(c => c.responsable_id).filter(Boolean);

    const { data: bureauProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id, prenom, nom, role, email, avatar_url, poste_association')
      .or(`role.in.(admin_ca,superadmin,tresorier),id.in.(${respIds.length > 0 ? respIds.join(',') : '00000000-0000-0000-0000-000000000000'})`);
    
    return bureauProfiles || [];
  }

  if (type_reunion === 'commission' && commission_id) {
    const { data: cmList } = await supabaseAdmin
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

  // Fallback pour extraordinaire/projet: Si commission_id spécifié, restreindre à la commission, sinon restreindre aux membres convoqués
  if (commission_id) {
    const { data: cmList } = await supabaseAdmin
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

  // Pour le bureau ou admin: tous les membres
  const { data: userProf } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user?.id || '')
    .single();

  if (userProf && ['admin_ca', 'tresorier', 'superadmin'].includes(userProf.role)) {
    const { data: allData } = await supabaseAdmin
      .from('profiles')
      .select('id, prenom, nom, role, email, avatar_url, poste_association')
      .eq('statut_adhesion', 'approuve')
      .order('prenom');
    return allData || [];
  }

  // Si membre simple: seulement son profil
  if (user) {
    const { data: mySelf } = await supabaseAdmin
      .from('profiles')
      .select('id, prenom, nom, role, email, avatar_url, poste_association')
      .eq('id', user.id);
    return mySelf || [];
  }

  return [];
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

  const supabaseAdmin = createAdminClient();

  // Verification de sécurité selon le rôle du créateur
  const { data: userProf } = await supabaseAdmin
    .from('profiles')
    .select('role, poste_association, commission_membres(commission_id, role_commission)')
    .eq('id', user.id)
    .single();

  const roleSys = userProf?.role || '';
  const isBureau = ['admin_ca', 'tresorier', 'superadmin'].includes(roleSys);
  const userCommMap = new Map((userProf?.commission_membres || []).map((cm: any) => [cm.commission_id, cm.role_commission]));
  const userCommIds = new Set((userProf?.commission_membres || []).map((cm: any) => cm.commission_id));

  // RÈGLE 1 : Un membre simple sans commission ni rôle d'encadrement NE PEUT PAS créer de réunion
  if (!isBureau && userCommIds.size === 0) {
    return { success: false, error: 'Accès refusé : Seuls les membres du Bureau ou les membres actifs de commission peuvent convoquer des réunions.' };
  }

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

    // RÈGLE 2 : Vérifier que le créateur fait au moins partie de cette commission s'il n'est pas bureau
    if (!isBureau && !userCommIds.has(payload.commission_id)) {
      return { success: false, error: 'Accès refusé : Vous devez être membre de cette commission pour en convoquer la séance.' };
    }

    // RÈGLE 3 : Vérifier que TOUS les membres convoqués appartiennent bien à cette commission
    const { data: cmList } = await supabaseAdmin
      .from('commission_membres')
      .select('profile_id')
      .eq('commission_id', payload.commission_id)
      .eq('actif', true);

    const validCommMemberIds = new Set((cmList || []).map(cm => cm.profile_id));
    if (payload.convoques_ids && payload.convoques_ids.length > 0) {
      const illegalInvasions = payload.convoques_ids.filter(id => id !== user.id && !validCommMemberIds.has(id));
      if (illegalInvasions.length > 0) {
        return { success: false, error: 'Sécurité : Vous ne pouvez convoquer que les membres appartenant à cette commission.' };
      }
    }
  }

  const { data: newReunion, error } = await supabaseAdmin
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
    console.error('Erreur insertion reunion:', error);
    return { success: false, error: error?.message || 'Erreur de création de la réunion' };
  }

  // 1. Déterminer les personnes convoquées à partir des IDs cochés ou éligibles par défaut
  const convoqueSet = new Set<string>();
  if (payload.convoques_ids && payload.convoques_ids.length > 0) {
    payload.convoques_ids.forEach(id => convoqueSet.add(id));
  } else {
    // Si aucun ID n'a été spécifié explicitement, convoquer tous les membres éligibles par défaut
    const defaultEligible = await getEligibleMembersForReunion(payload.type_reunion, payload.commission_id);
    (defaultEligible || []).forEach((m: any) => convoqueSet.add(m.id));
  }
  convoqueSet.add(user.id); // L'organisateur est toujours présent/convoqué

  // 2. Insérer l'émargement / convocations
  const presencesPayload = Array.from(convoqueSet).map(profileId => ({
    reunion_id: newReunion.id,
    profile_id: profileId,
    statut: profileId === user.id ? 'present' : 'convoque',
  }));

  if (presencesPayload.length > 0) {
    const { error: presErr } = await supabaseAdmin.from('reunion_presences').insert(presencesPayload);
    if (presErr) console.error('Erreur insertion reunion_presences:', presErr);

    // 2b. Générer les notifications internes et envoyer les e-mails discrets
    const summonedOtherMemberIds = Array.from(convoqueSet).filter(id => id !== user.id);
    if (summonedOtherMemberIds.length > 0) {
      const { data: targetProfiles } = await supabaseAdmin
        .from('profiles')
        .select('id, email, prenom, nom')
        .in('id', summonedOtherMemberIds);

      if (targetProfiles && targetProfiles.length > 0) {
        // Notifications internes avec lien vers la séance de la réunion
        const internalNotifs = targetProfiles.map(p => ({
          profile_id: p.id,
          titre: 'Convocation à une réunion de travail',
          contenu: `Vous avez été convoqué(e) à une réunion de travail (${newReunion.titre}). Cliquez pour consulter la séance et répondre.`,
          link_url: `/dashboard/reunions/${newReunion.id}`,
        }));

        const { error: notifErr } = await supabaseAdmin.from('notifications').insert(internalNotifs);
        if (notifErr) console.error('Erreur insertion notifications réunion:', notifErr);

        // Envoi d'emails discrets (sans tous les détails) avec invitation à se connecter
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://synergie-uqo.ca';
        const loginUrl = `${appUrl}/login`;
        const emailSubject = `[Synergie UQO] Convocation à une réunion de travail`;

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px;">
            <h2 style="color: #0f172a; font-size: 18px; font-weight: bold;">Synergie UQO</h2>
            <p style="color: #334155; font-size: 14px; line-height: 1.6;">Bonjour,</p>
            <p style="color: #334155; font-size: 14px; line-height: 1.6;">
              Vous avez été convoqué(e) à une réunion de travail (<strong>${newReunion.titre}</strong>) sur la plateforme <strong>Synergie UQO</strong>.
            </p>
            <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
              Veuillez vous connecter à votre espace membre pour consulter l'ordre du jour, la date/lieu et confirmer votre présence.
            </p>
            <div style="margin: 24px 0; text-align: center;">
              <a href="${loginUrl}" style="background-color: #0f172a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 13px; display: inline-block;">
                Se connecter à Synergie UQO
              </a>
            </div>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="color: #94a3b8; font-size: 11px; text-align: center;">
              Cet email automatique vous a été envoyé par Synergie UQO. Veuillez ne pas y répondre directement.
            </p>
          </div>
        `;

        const { sendMail } = await import('@/lib/email');

        // Envoi asynchrone des e-mails sans bloquer
        Promise.all(
          targetProfiles
            .filter(p => p.email && p.email.includes('@'))
            .map(p => sendMail({ to: p.email, subject: emailSubject, html: emailHtml }).catch(err => console.error(`Erreur email réunion pour ${p.email}:`, err)))
        ).catch(err => console.error('Erreur global sendMail réunion:', err));
      }
    }
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
    const { error: odjErr } = await supabaseAdmin.from('reunion_odj_items').insert(odjPayload);
    if (odjErr) console.error('Erreur insertion reunion_odj_items:', odjErr);
  }

  revalidatePath('/dashboard/reunions');
  return { success: true, reunionId: newReunion.id };
}

/**
 * Mise à jour du statut ou des détails d'une réunion.
 */
export async function updateReunion(reunionId: string, payload: any) {
  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin
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

  const supabaseAdmin = createAdminClient();

  const { error } = await supabaseAdmin
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
  const supabaseAdmin = createAdminClient();

  try {
    for (const item of presences) {
      const { error } = await supabaseAdmin
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
  const supabaseAdmin = createAdminClient();

  // Supprimer et réinsérer pour maintenir l'ordre exact
  await supabaseAdmin.from('reunion_odj_items').delete().eq('reunion_id', reunionId);

  if (odjItems.length > 0) {
    const payload = odjItems.map((item, idx) => ({
      reunion_id: reunionId,
      ordre: idx + 1,
      titre: item.titre,
      description: item.description || null,
      duree_minutes: item.duree_minutes || 15,
      intervenant_id: item.intervenant_id || null,
    }));

    const { error } = await supabaseAdmin.from('reunion_odj_items').insert(payload);
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

  const supabaseAdmin = createAdminClient();

  const { error } = await supabaseAdmin
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
    await supabaseAdmin.from('reunions').update({ statut: 'terminee' }).eq('id', payload.reunionId);
  }

  revalidatePath(`/dashboard/reunions/${payload.reunionId}`);
  revalidatePath('/dashboard/reunions');
  return { success: true };
}
