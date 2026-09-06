'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function ensureSystemCommissionsExist() {
  const supabase = createClient();

  const systemCommissions = [
    {
      code_systeme: 'comm_communication',
      nom: 'Communication & Marketing',
      description: 'Commission permanente chargée de l\'image de marque, des médias sociaux, de la gazette et de la promotion des membres.',
      objectifs: 'La Commission média est chargée de produire, gérer et diffuser les contenus médiatiques de l’association. Elle assure la couverture des activités, la gestion des plateformes numériques, la création des supports visuels et audiovisuels, ainsi que l’archivage des contenus.',
      est_systeme: true,
      statut: 'active',
      budget_annuel: 1000.00,
    },
    {
      code_systeme: 'comm_partenariats',
      nom: 'Relations Publiques & Partenariats',
      description: 'Commission permanente chargée des commandites, des relations institutionnelles et du réseau des partenaires corporatifs.',
      objectifs: 'Promouvoir l\'image de marque de Synergie UQO auprès des membres, de l\'université et du public, développer et entretenir des partenariats stratégiques (entreprises, universités, organismes publics/privés), négocier des avantages pour les membres et sécuriser des collaborations et commandites.',
      est_systeme: true,
      statut: 'active',
      budget_annuel: 1500.00,
    },
    {
      code_systeme: 'comm_evenements',
      nom: 'Événements & Intégration',
      description: 'Commission permanente chargée de la conception, de la logistique et de l\'organisation des Assemblées Générales, galas et ateliers.',
      objectifs: 'La Commission évènementielle et intégration est chargée de planifier, organiser et coordonner les activités de l’association. Elle veille à l’accueil et à l’intégration des nouveaux membres, favorise la cohésion entre les membres et contribue au renforcement du sentiment d’appartenance.',
      est_systeme: true,
      statut: 'active',
      budget_annuel: 2000.00,
    },
    {
      code_systeme: 'comm_solidarite',
      nom: 'Entraide, Inclusion & Solidarité',
      description: 'Commission permanente chargée de la gouvernance confidentielle du Fonds de Solidarité, du mentorat et de l\'accueil des nouveaux arrivants.',
      objectifs: "Identifier et accompagner les membres en situation de difficulté (sociale, financière, académique ou personnelle), gérer en toute confidentialité le Fonds de Solidarité, piloter les actions d'entraide, de parrainage et de soutien et lutter contre l'isolement communautaire.",
      est_systeme: true,
      statut: 'active',
      budget_annuel: 2500.00,
    },
  ];

  for (const sysComm of systemCommissions) {
    try {
      const { data: existing } = await supabase
        .from('commissions')
        .select('id')
        .eq('nom', sysComm.nom)
        .maybeSingle();

      if (!existing) {
        await supabase
          .from('commissions')
          .insert(sysComm);
      } else {
        await supabase
          .from('commissions')
          .update({
            est_systeme: true,
            code_systeme: sysComm.code_systeme,
            objectifs: sysComm.objectifs
          })
          .eq('id', existing.id);
      }
    } catch (err) {
      console.warn("Could not auto-seed system commission:", sysComm.nom, err);
    }
  }
}

export async function getCommissionDetails(commissionId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Non authentifié" };

  const { data: commission, error: commErr } = await supabase
    .from('commissions')
    .select('*')
    .eq('id', commissionId)
    .single();

  if (commErr || !commission) {
    return { error: "Commission introuvable" };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, prenom, nom, role')
    .eq('id', user.id)
    .single();

  const isAdmin = ['admin_ca', 'tresorier', 'superadmin'].includes(profile?.role || '');

  let responsableProfile = null;
  let responsableAdjointProfile = null;

  if (commission.responsable_id) {
    const { data: resp } = await supabase
      .from('profiles')
      .select('id, prenom, nom, email, telephone, avatar_url, categorie')
      .eq('id', commission.responsable_id)
      .single();
    responsableProfile = resp;
  }

  if (commission.responsable_adjoint_id) {
    const { data: adj } = await supabase
      .from('profiles')
      .select('id, prenom, nom, email, telephone, avatar_url, categorie')
      .eq('id', commission.responsable_adjoint_id)
      .single();
    responsableAdjointProfile = adj;
  }

  const { data: membership } = await supabase
    .from('commission_membres')
    .select('*')
    .eq('commission_id', commissionId)
    .eq('profile_id', user.id)
    .eq('actif', true)
    .maybeSingle();

  const isResponsable = commission.responsable_id === user.id;
  const isAdjoint = commission.responsable_adjoint_id === user.id;

  return {
    success: true,
    commission,
    responsableProfile,
    responsableAdjointProfile,
    userRole: isResponsable
      ? 'Responsable Principal'
      : isAdjoint
      ? 'Responsable Adjoint'
      : membership
      ? membership.role_commission || 'Membre statutaire'
      : isAdmin
      ? 'Superviseur Admin'
      : null,
    isMember: !!membership || isResponsable || isAdjoint || isAdmin,
    isLeader: isResponsable || isAdjoint || isAdmin,
  };
}

export async function getCommissionMembers(commissionId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('commission_membres')
    .select(`
      id,
      role_commission,
      actif,
      created_at,
      profiles:profile_id (
        id,
        prenom,
        nom,
        email,
        telephone,
        categorie,
        avatar_url
      )
    `)
    .eq('commission_id', commissionId)
    .eq('actif', true);

  if (error) {
    return { error: "Impossible de récupérer les membres." };
  }

  return { success: true, members: data || [] };
}

export async function getCommissionMeetings(commissionId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('commission_reunions')
    .select(`
      *,
      organisateur:cree_par (
        prenom,
        nom
      )
    `)
    .eq('commission_id', commissionId)
    .order('date_reunion', { ascending: true });

  if (error) {
    return { error: "Erreur lors du chargement des réunions." };
  }

  return { success: true, meetings: data || [] };
}

export async function createCommissionMeeting(data: {
  commission_id: string;
  titre: string;
  ordre_du_jour?: string;
  date_reunion: string;
  lieu_ou_lien?: string;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Non authentifié" };

  const { data: meeting, error } = await supabase
    .from('commission_reunions')
    .insert({
      commission_id: data.commission_id,
      titre: data.titre,
      ordre_du_jour: data.ordre_du_jour || null,
      date_reunion: data.date_reunion,
      lieu_ou_lien: data.lieu_ou_lien || null,
      cree_par: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error(error);
    return { error: "Erreur lors de la création de la réunion." };
  }

  revalidatePath(`/dashboard/commissions/${data.commission_id}`);
  return { success: true, meeting };
}

export async function getCommissionBudgetSummary(commissionId: string) {
  const supabase = createClient();

  const { data: commission } = await supabase
    .from('commissions')
    .select('budget_annuel')
    .eq('id', commissionId)
    .single();

  const budget = commission?.budget_annuel || 0;

  const { data: depenses } = await supabase
    .from('depenses_remboursements')
    .select('montant, statut')
    .eq('commission_id', commissionId)
    .eq('statut', 'approuve');

  const totalDepense = (depenses || []).reduce((sum, d) => sum + (parseFloat(d.montant) || 0), 0);

  return {
    success: true,
    budgetAnnuel: budget,
    totalDepense,
    soldeDisponible: Math.max(0, budget - totalDepense),
  };
}

// ========================================================
// ACTIONS DE GESTION DES MISSIONS PERMANENTES (CRUD)
// ========================================================
export async function getCommissionMissions(commissionId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('commission_missions')
    .select('*')
    .eq('commission_id', commissionId)
    .order('numero_mission', { ascending: true });

  if (error) {
    console.error('Error fetching commission missions:', error);
    return { success: false, error: 'Erreur lors de la récupération des missions.', missions: [] };
  }

  return { success: true, missions: data || [] };
}

export async function createCommissionMission(data: {
  commission_id: string;
  numero_mission?: number;
  titre: string;
  description?: string;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Non authentifié' };

  let num = data.numero_mission;
  if (!num) {
    const { data: existing } = await supabase
      .from('commission_missions')
      .select('numero_mission')
      .eq('commission_id', data.commission_id)
      .order('numero_mission', { ascending: false })
      .limit(1);

    num = (existing?.[0]?.numero_mission || 0) + 1;
  }

  const { data: mission, error } = await supabase
    .from('commission_missions')
    .insert({
      commission_id: data.commission_id,
      numero_mission: num,
      titre: data.titre,
      description: data.description || null,
      actif: true,
    })
    .select()
    .single();

  if (error) {
    console.error(error);
    return { error: 'Erreur lors de la création de la mission.' };
  }

  revalidatePath(`/dashboard/commissions/${data.commission_id}`);
  return { success: true, mission };
}

export async function updateCommissionMission(id: string, data: {
  commission_id: string;
  titre: string;
  description?: string;
  actif?: boolean;
}) {
  const supabase = createClient();
  const { error } = await supabase
    .from('commission_missions')
    .update({
      titre: data.titre,
      description: data.description || null,
      actif: data.actif ?? true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error(error);
    return { error: 'Erreur lors de la mise à jour de la mission.' };
  }

  revalidatePath(`/dashboard/commissions/${data.commission_id}`);
  return { success: true };
}

export async function deleteCommissionMission(id: string, commissionId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from('commission_missions')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(error);
    return { error: 'Erreur lors de la suppression de la mission.' };
  }

  revalidatePath(`/dashboard/commissions/${commissionId}`);
  return { success: true };
}

// ========================================================
// ACTIONS DE GESTION DES OBJECTIFS (Reliés aux Missions)
// ========================================================
export async function getCommissionObjectifs(commissionId: string) {
  const supabase = createClient();
  const { data: objectifs, error } = await supabase
    .from('commission_objectifs')
    .select(`
      *,
      missions:objectif_missions (
        mission:mission_id (id, numero_mission, titre)
      ),
      taches (id, titre, statut_global, progression_globale)
    `)
    .eq('commission_id', commissionId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching commission objectifs:', error);
    return { success: false, error: 'Erreur lors du chargement des objectifs.', objectifs: [] };
  }

  return { success: true, objectifs: objectifs || [] };
}

export async function createCommissionObjectif(data: {
  commission_id: string;
  titre: string;
  description?: string;
  date_debut?: string;
  date_echeance?: string;
  priorite?: string;
  mission_ids?: string[];
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Non authentifié' };

  const { data: obj, error: objErr } = await supabase
    .from('commission_objectifs')
    .insert({
      commission_id: data.commission_id,
      titre: data.titre,
      description: data.description || null,
      date_debut: data.date_debut || null,
      date_echeance: data.date_echeance || null,
      priorite: data.priorite || 'moyenne',
      statut: 'en_cours',
      cree_par: user.id,
    })
    .select()
    .single();

  if (objErr || !obj) {
    console.error(objErr);
    return { error: 'Erreur lors de la création de l\'objectif.' };
  }

  if (data.mission_ids && data.mission_ids.length > 0) {
    const links = data.mission_ids.map(mId => ({
      objectif_id: obj.id,
      mission_id: mId,
    }));
    const { error: linkErr } = await supabase.from('objectif_missions').insert(links);
    if (linkErr) console.error('Error linking missions:', linkErr);
  }

  revalidatePath(`/dashboard/commissions/${data.commission_id}`);
  return { success: true, objectif: obj };
}

export async function updateCommissionObjectif(id: string, data: {
  commission_id: string;
  titre: string;
  description?: string;
  date_debut?: string;
  date_echeance?: string;
  statut?: string;
  priorite?: string;
  mission_ids?: string[];
}) {
  const supabase = createClient();

  const { error: objErr } = await supabase
    .from('commission_objectifs')
    .update({
      titre: data.titre,
      description: data.description || null,
      date_debut: data.date_debut || null,
      date_echeance: data.date_echeance || null,
      statut: data.statut || 'en_cours',
      priorite: data.priorite || 'moyenne',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (objErr) {
    console.error(objErr);
    return { error: 'Erreur lors de la mise à jour de l\'objectif.' };
  }

  if (data.mission_ids !== undefined) {
    await supabase.from('objectif_missions').delete().eq('objectif_id', id);
    if (data.mission_ids.length > 0) {
      const links = data.mission_ids.map(mId => ({
        objectif_id: id,
        mission_id: mId,
      }));
      await supabase.from('objectif_missions').insert(links);
    }
  }

  revalidatePath(`/dashboard/commissions/${data.commission_id}`);
  return { success: true };
}

export async function deleteCommissionObjectif(id: string, commissionId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from('commission_objectifs')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(error);
    return { error: 'Erreur lors de la suppression de l\'objectif.' };
  }

  revalidatePath(`/dashboard/commissions/${commissionId}`);
  return { success: true };
}
