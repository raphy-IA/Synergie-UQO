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
      organisateur:profiles!organisateur_id(id, prenom, nom, email, avatar_url, role),
      secretaire:profiles!secretaire_id(id, prenom, nom, email, avatar_url, role),
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

  // 1. DRAFT FILTER: Draft meetings are strictly visible ONLY to creator or superadmin
  const myCommIds = new Set((userProf?.commission_membres || []).map((cm: any) => cm.commission_id));

  result = result.filter(r => {
    if (r.statut === 'brouillon') {
      return r.organisateur_id === user.id || roleSys === 'superadmin';
    }

    // 2. CONFIDENTIALITY FILTER FOR PUBLISHED MEETINGS: If not bureau member, only see meetings where summoned, organizing, or member of the commission
    if (!isBureau) {
      const isOrganisateur = r.organisateur_id === user.id;
      const isSummoned = (r.presences || []).some((p: any) => p.profile_id === user.id);
      const isMyCommMeeting = r.type_reunion === 'commission' && r.commission_id && myCommIds.has(r.commission_id);
      return isOrganisateur || isSummoned || isMyCommMeeting;
    }
    return true;
  });

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
      organisateur:profiles!organisateur_id(id, prenom, nom, email, avatar_url, role),
      secretaire:profiles!secretaire_id(id, prenom, nom, email, avatar_url, role),
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

  // DRAFT CHECK: Draft meetings are strictly visible ONLY to creator or superadmin
  if (reunion.statut === 'brouillon') {
    if (reunion.organisateur_id !== user.id && roleSys !== 'superadmin') {
      console.error('Accès refusé : la réunion est en mode brouillon.');
      return null;
    }
  }

  // CONFIDENTIALITY CHECK FOR DETAILS (PUBLISHED MEETINGS)
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
 * Détermine le secrétaire/rapporteur de séance par défaut.
 */
export async function getDefaultSecretaireId(type_reunion: string, commission_id?: string, convoques_ids?: string[], organisateur_id?: string) {
  const supabaseAdmin = createAdminClient();

  if (type_reunion === 'commission' && commission_id) {
    const { data: cmList } = await supabaseAdmin
      .from('commission_membres')
      .select('profile_id, role_commission')
      .eq('commission_id', commission_id)
      .eq('actif', true);

    const adjoint = (cmList || []).find((cm: any) =>
      (cm.role_commission || '').toLowerCase().includes('adjoint') ||
      (cm.role_commission || '').toLowerCase().includes('vice') ||
      (cm.role_commission || '').toLowerCase().includes('secretaire')
    );

    if (adjoint && (!convoques_ids || convoques_ids.length === 0 || convoques_ids.includes(adjoint.profile_id))) {
      return adjoint.profile_id;
    }
  } else {
    const { data: secProf } = await supabaseAdmin
      .from('profiles')
      .select('id, role, poste_association')
      .or('role.ilike.%secretaire%,poste_association.ilike.%secrétaire%,poste_association.ilike.%secretaire%')
      .limit(1);

    if (secProf && secProf.length > 0) {
      const sId = secProf[0].id;
      if (!convoques_ids || convoques_ids.length === 0 || convoques_ids.includes(sId)) {
        return sId;
      }
    }
  }

  return organisateur_id || (convoques_ids?.[0] || null);
}

/**
 * Création d'une réunion de travail avec convocations initiales et vérification stricte des droits.
 * Par défaut, la réunion est créée au statut 'brouillon'.
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
  secretaire_id?: string;
  convoques_ids?: string[]; // IDs des profils cochés
  odj_items?: { titre: string; description?: string; duree_minutes?: number }[];
  publierDirectement?: boolean;
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

  const defaultSecretaireId = await getDefaultSecretaireId(payload.type_reunion, payload.commission_id, payload.convoques_ids, user.id);
  const finalSecretaireId = payload.secretaire_id || defaultSecretaireId;

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
      secretaire_id: finalSecretaireId,
      statut: payload.publierDirectement ? 'convoquee' : 'brouillon',
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

  // 4. Si la publication directe est demandée, déclencher la publication & notifications
  if (payload.publierDirectement) {
    await publishReunion(newReunion.id);
  }

  revalidatePath('/dashboard/reunions');
  return { success: true, reunionId: newReunion.id };
}

/**
 * Publication et convocation explicite d'une réunion.
 * Déclenche les notifications internes et les e-mails discrets vers tous les membres convoqués.
 */
export async function publishReunion(reunionId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Non authentifié' };

  const supabaseAdmin = createAdminClient();

  const { data: reunion } = await supabaseAdmin
    .from('reunions')
    .select('*, presences:reunion_presences(profile_id)')
    .eq('id', reunionId)
    .single();

  if (!reunion) return { success: false, error: 'Réunion introuvable.' };

  const { data: userProf } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isBureau = ['admin_ca', 'tresorier', 'superadmin'].includes(userProf?.role || '');
  if (reunion.organisateur_id !== user.id && !isBureau) {
    return { success: false, error: 'Seul l\'organisateur ou le Bureau peut publier cette réunion.' };
  }

  // Passer la réunion au statut convoquée
  const { error: updateErr } = await supabaseAdmin
    .from('reunions')
    .update({ statut: 'convoquee', updated_at: new Date().toISOString() })
    .eq('id', reunionId);

  if (updateErr) {
    return { success: false, error: 'Erreur lors de la publication de la réunion.' };
  }

  // Notifier et envoyer les courriels discrets aux membres convoqués (sauf le créateur)
  const summonedOtherMemberIds = (reunion.presences || [])
    .map((p: any) => p.profile_id)
    .filter((id: string) => id !== user.id);

  if (summonedOtherMemberIds.length > 0) {
    const { data: targetProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id, email, prenom, nom')
      .in('id', summonedOtherMemberIds);

    if (targetProfiles && targetProfiles.length > 0) {
      const internalNotifs = targetProfiles.map(p => ({
        profile_id: p.id,
        titre: 'Convocation à une réunion de travail',
        contenu: `Vous avez été convoqué(e) à une réunion de travail (${reunion.titre}). Cliquez pour consulter la séance et répondre.`,
        link_url: `/dashboard/reunions/${reunionId}`,
      }));

      const { error: notifErr } = await supabaseAdmin.from('notifications').insert(internalNotifs);
      if (notifErr) console.error('Erreur insertion notifications réunion:', notifErr);

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://synergie-uqo.ca';
      const loginUrl = `${appUrl}/login`;
      const emailSubject = `[Synergie UQO] Convocation à une réunion de travail`;

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px;">
          <h2 style="color: #0f172a; font-size: 18px; font-weight: bold;">Synergie UQO</h2>
          <p style="color: #334155; font-size: 14px; line-height: 1.6;">Bonjour,</p>
          <p style="color: #334155; font-size: 14px; line-height: 1.6;">
            Vous avez été convoqué(e) à une réunion de travail (<strong>${reunion.titre}</strong>) sur la plateforme <strong>Synergie UQO</strong>.
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

      Promise.all(
        targetProfiles
          .filter(p => p.email && p.email.includes('@'))
          .map(p => sendMail({ to: p.email, subject: emailSubject, html: emailHtml }).catch(err => console.error(`Erreur email réunion pour ${p.email}:`, err)))
      ).catch(err => console.error('Erreur global sendMail réunion:', err));
    }
  }

  revalidatePath('/dashboard/reunions');
  revalidatePath(`/dashboard/reunions/${reunionId}`);
  return { success: true };
}

/**
 * Suppression complète d'une réunion.
 */
export async function deleteReunion(reunionId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Non authentifié' };

  const supabaseAdmin = createAdminClient();

  const { data: reunion } = await supabaseAdmin
    .from('reunions')
    .select('organisateur_id')
    .eq('id', reunionId)
    .single();

  if (!reunion) return { success: false, error: 'Réunion introuvable.' };

  const { data: userProf } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isBureau = ['admin_ca', 'tresorier', 'superadmin'].includes(userProf?.role || '');
  if (reunion.organisateur_id !== user.id && !isBureau) {
    return { success: false, error: 'Droits insuffisants pour supprimer cette réunion.' };
  }

  const { error } = await supabaseAdmin
    .from('reunions')
    .delete()
    .eq('id', reunionId);

  if (error) {
    console.error('Erreur suppression réunion:', error);
    return { success: false, error: 'Erreur lors de la suppression de la réunion.' };
  }

  revalidatePath('/dashboard/reunions');
  return { success: true };
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

  const { data: reunion } = await supabaseAdmin
    .from('reunions')
    .select('statut')
    .eq('id', payload.reunionId)
    .single();

  if (reunion && (reunion.statut === 'en_cours' || reunion.statut === 'terminee')) {
    return { success: false, error: 'La convocation est verrouillée (séance en cours ou terminée). L\'émargement est désormais géré par le secrétariat de séance.' };
  }

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
 * Mise à jour globale de l'émargement / présences par le secrétaire ou l'organisateur.
 */
export async function updateEmargement(reunionId: string, presences: { profile_id: string; statut: string; motif_absence?: string }[]) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Non authentifié' };

  const supabaseAdmin = createAdminClient();

  const { data: reunion } = await supabaseAdmin
    .from('reunions')
    .select('organisateur_id, secretaire_id')
    .eq('id', reunionId)
    .single();

  const { data: userProf } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isBureau = ['admin_ca', 'tresorier', 'superadmin'].includes(userProf?.role || '');
  const isSecretaire = reunion?.secretaire_id === user.id;
  const isOrganisateur = reunion?.organisateur_id === user.id;

  if (!isSecretaire && !isOrganisateur && !isBureau) {
    return { success: false, error: 'Accès refusé : Seul le Secrétaire de séance désigné, l\'organisateur ou le Bureau peut enregistrer l\'émargement effectif.' };
  }

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

/**
 * Mise à jour des informations d'une réunion (titre, dates, type, lieu/visio, convoqués, ODJ).
 * Seul le créateur de la réunion ou le superadmin est autorisé à effectuer les modifications.
 */
export async function updateReunionDetails(reunionId: string, payload: {
  titre: string;
  type_reunion: string;
  format_reunion?: string;
  lieu?: string;
  lien_visio?: string;
  date_debut: string;
  date_fin?: string;
  description?: string;
  commission_id?: string;
  secretaire_id?: string;
  convoques_ids?: string[];
  odj_items?: { titre: string; description?: string; duree_minutes?: number }[];
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Non authentifié' };

  const supabaseAdmin = createAdminClient();

  const { data: reunion } = await supabaseAdmin
    .from('reunions')
    .select('*, presences:reunion_presences(profile_id)')
    .eq('id', reunionId)
    .single();

  if (!reunion) return { success: false, error: 'Réunion introuvable.' };

  const { data: userProf } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const roleSys = userProf?.role || '';
  const isCreator = reunion.organisateur_id === user.id;
  const isSuperadmin = roleSys === 'superadmin';

  if (!isCreator && !isSuperadmin) {
    return { success: false, error: 'Seul le créateur de la réunion ou le superadmin peut la modifier.' };
  }

  // 1. Mettre à jour la table reunions
  const { error: updateErr } = await supabaseAdmin
    .from('reunions')
    .update({
      titre: payload.titre,
      type_reunion: payload.type_reunion,
      format_reunion: payload.format_reunion || 'presentiel',
      lieu: payload.lieu || null,
      lien_visio: payload.lien_visio || null,
      date_debut: payload.date_debut,
      date_fin: payload.date_fin || null,
      description: payload.description || null,
      commission_id: payload.commission_id || null,
      secretaire_id: payload.secretaire_id || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reunionId);

  if (updateErr) {
    console.error('Erreur mise a jour reunion:', updateErr);
    return { success: false, error: updateErr.message || 'Erreur lors de la mise à jour.' };
  }

  // 2. Resynchroniser les presences si convoques_ids est fourni
  if (payload.convoques_ids && payload.convoques_ids.length > 0) {
    const convoqueSet = new Set<string>(payload.convoques_ids);
    convoqueSet.add(reunion.organisateur_id);

    const existingPresences = reunion.presences || [];
    const statusMap = new Map<string, string>();
    existingPresences.forEach((p: any) => statusMap.set(p.profile_id, p.statut));

    await supabaseAdmin
      .from('reunion_presences')
      .delete()
      .eq('reunion_id', reunionId);

    const newPresences = Array.from(convoqueSet).map(pid => ({
      reunion_id: reunionId,
      profile_id: pid,
      statut: pid === reunion.organisateur_id ? 'present' : (statusMap.get(pid) || 'convoque'),
    }));

    const { error: presErr } = await supabaseAdmin
      .from('reunion_presences')
      .insert(newPresences);
    if (presErr) console.error('Erreur re-insertion presences:', presErr);
  }

  // 3. Remplacer les items ODJ si odj_items est fourni
  if (payload.odj_items) {
    await supabaseAdmin
      .from('reunion_odj_items')
      .delete()
      .eq('reunion_id', reunionId);

    if (payload.odj_items.length > 0) {
      const odjPayload = payload.odj_items.map((item, idx) => ({
        reunion_id: reunionId,
        ordre: idx + 1,
        titre: item.titre,
        description: item.description || null,
        duree_minutes: item.duree_minutes || 15,
      }));
      const { error: odjErr } = await supabaseAdmin.from('reunion_odj_items').insert(odjPayload);
      if (odjErr) console.error('Erreur re-insertion odj_items:', odjErr);
    }
  }

  revalidatePath('/dashboard/reunions');
  revalidatePath(`/dashboard/reunions/${reunionId}`);
  return { success: true };
}
