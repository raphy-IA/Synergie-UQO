'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface TaskAssignmentPayload {
  titre: string;
  description?: string;
  priorite?: 'basse' | 'moyenne' | 'haute';
  contexte?: 'general' | 'bureau' | 'commission' | 'ag';
  dateEcheance?: string | null;
  cibleType: 'membre' | 'bureau' | 'commission';
  cibleId?: string | null; // Profile ID, Commission ID
  evenementId?: string | null;
}

// 1. Récupérer les cibles d'affectation autorisées pour l'utilisateur connecté selon les règles de gouvernance
export async function getAssignableTargets() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Récupération du profil de l'utilisateur courant
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, commission_membres(*)')
    .eq('id', user.id)
    .single();

  if (!profile) return null;

  const poste = (profile.poste_association || '').toLowerCase();
  const roleSys = profile.role || '';

  const isPresident = poste === 'president' || roleSys === 'superadmin' || roleSys === 'admin_ca';
  const isVicePresident = poste === 'vice_president';
  const isSecretaire = poste === 'secretaire' || poste === 'secretaire_adjoint';

  // Vérifier si responsable de commission
  const { data: managedCommissions } = await supabase
    .from('commissions')
    .select('*, commission_membres(*)')
    .or(`responsable_id.eq.${user.id}`);

  // Ou membre avec rôle responsable/président dans commission_membres
  const { data: commMembresRole } = await supabase
    .from('commission_membres')
    .select('commission_id, role_commission')
    .eq('profile_id', user.id)
    .in('role_commission', ['president', 'responsable', 'vice_president']);

  const managedCommIds = new Set<string>();
  if (managedCommissions) managedCommissions.forEach(c => managedCommIds.add(c.id));
  if (commMembresRole) commMembresRole.forEach(cm => managedCommIds.add(cm.commission_id));

  const isResponsableComm = managedCommIds.size > 0;

  // Récupération des membres admissibles
  let allowedMembersQuery = supabase
    .from('profiles')
    .select('id, prenom, nom, role, poste_association, avatar_url')
    .eq('statut_adhesion', 'approuve');

  let allowedMembers: any[] = [];

  if (isPresident) {
    // Président peut affecter des tâches à TOUT LE MONDE
    const { data } = await allowedMembersQuery;
    allowedMembers = data || [];
  } else if (isVicePresident) {
    // Vice-président peut affecter des tâches à tout le monde SAUF le Président
    const { data } = await allowedMembersQuery;
    allowedMembers = (data || []).filter(m => (m.poste_association || '').toLowerCase() !== 'president');
  } else if (isResponsableComm) {
    // Responsable de commission peut affecter aux membres de sa commission
    const commIdsArray = Array.from(managedCommIds);
    const { data: cmList } = await supabase
      .from('commission_membres')
      .select('profile_id, profiles(id, prenom, nom, role, poste_association)')
      .in('commission_id', commIdsArray)
      .eq('actif', true);

    if (cmList) {
      const memberMap = new Map<string, any>();
      cmList.forEach((item: any) => {
        if (item.profiles) memberMap.set(item.profiles.id, item.profiles);
      });
      allowedMembers = Array.from(memberMap.values());
    }
  } else if (isSecretaire) {
    // Secrétaire peut cibler des membres associés aux commissions ou membres
    const { data } = await allowedMembersQuery;
    allowedMembers = data || [];
  }

  // Récupération des commissions autorisées
  let allowedCommissions: any[] = [];
  if (isPresident || isVicePresident || isSecretaire) {
    const { data: comms } = await supabase.from('commissions').select('*').eq('statut', 'active');
    allowedCommissions = comms || [];
  } else if (isResponsableComm) {
    const commIdsArray = Array.from(managedCommIds);
    const { data: comms } = await supabase.from('commissions').select('*').in('id', commIdsArray);
    allowedCommissions = comms || [];
  }

  return {
    currentUser: {
      id: profile.id,
      prenom: profile.prenom,
      nom: profile.nom,
      poste: poste,
      isPresident,
      isVicePresident,
      isSecretaire,
      isResponsableComm,
    },
    permissions: {
      canAssignToBureau: isPresident || isVicePresident,
      canAssignToAllMembers: isPresident || isVicePresident,
      canAssignToCommissions: isPresident || isVicePresident || isSecretaire || isResponsableComm,
    },
    allowedMembers,
    allowedCommissions,
  };
}

// 2. Créer une tâche selon les règles d'affectation et de délégation
export async function createTaskWithGovernance(payload: TaskAssignmentPayload) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Utilisateur non authentifié." };

  const { data: creatorProfile } = await supabase
    .from('profiles')
    .select('*, commission_membres(*)')
    .eq('id', user.id)
    .single();

  if (!creatorProfile) return { error: "Profil introuvable." };

  const posteCreator = (creatorProfile.poste_association || '').toLowerCase();
  const isPresident = posteCreator === 'president' || creatorProfile.role === 'superadmin';
  const isVicePresident = posteCreator === 'vice_president';
  const isSecretaire = posteCreator === 'secretaire' || posteCreator === 'secretaire_adjoint';

  // RÈGLE : Vice-Président ne peut pas affecter au Président
  if (isVicePresident && payload.cibleType === 'membre' && payload.cibleId) {
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('poste_association')
      .eq('id', payload.cibleId)
      .single();

    if ((targetProfile?.poste_association || '').toLowerCase() === 'president') {
      return { error: "Le Vice-Président ne peut pas affecter une tâche au Président." };
    }
  }

  // RÈGLE : Secrétaire peut affecter à une Commission
  if (isSecretaire && payload.cibleType === 'membre') {
    // Vérification supplémentaire si nécessaire
  }

  let taskInsertPayload: any = {
    titre: payload.titre,
    description: payload.description || '',
    statut: 'a_faire',
    priorite: payload.priorite || 'moyenne',
    contexte: payload.contexte || (payload.cibleType === 'bureau' ? 'bureau' : payload.cibleType === 'commission' ? 'commission' : 'general'),
    date_echeance: payload.dateEcheance || null,
    cree_par: user.id,
    cible_type: payload.cibleType,
    cible_id: payload.cibleId || null,
    evenement_id: payload.evenementId || null,
  };

  const assigneesToInsert: { profile_id: string; role_assignation: string }[] = [];

  // RÈGLE A : Affectation à une COMMISSION -> Affecté conjointement au Responsable et à son Adjoint
  if (payload.cibleType === 'commission' && payload.cibleId) {
    taskInsertPayload.commission_id = payload.cibleId;
    taskInsertPayload.affectation_conjointe = true;

    // Récupérer la commission et son responsable
    const { data: comm } = await supabase
      .from('commissions')
      .select('*, commission_membres(*, profiles(*))')
      .eq('id', payload.cibleId)
      .single();

    if (comm) {
      if (comm.responsable_id) {
        assigneesToInsert.push({ profile_id: comm.responsable_id, role_assignation: 'responsable' });
      }

      // Chercher l'adjoint de la commission dans commission_membres
      const adjointMember = comm.commission_membres?.find((cm: any) => 
        ['secretaire', 'vice_president', 'adjoint', 'coresponsable'].includes((cm.role_commission || '').toLowerCase()) && cm.profile_id !== comm.responsable_id
      );

      if (adjointMember) {
        assigneesToInsert.push({ profile_id: adjointMember.profile_id, role_assignation: 'adjoint' });
      } else {
        // Prendre un 2ème membre actif de la commission le cas échéant
        const secondMember = comm.commission_membres?.find((cm: any) => cm.profile_id !== comm.responsable_id);
        if (secondMember) {
          assigneesToInsert.push({ profile_id: secondMember.profile_id, role_assignation: 'adjoint' });
        }
      }

      // Si au moins un responsable est trouvé, le mettre comme assigné principal
      if (assigneesToInsert.length > 0) {
        taskInsertPayload.assigne_a = assigneesToInsert[0].profile_id;
      }
    }
  }

  // RÈGLE B : Affectation au BUREAU -> Affecté conjointement à TOUS les membres du bureau
  else if (payload.cibleType === 'bureau') {
    taskInsertPayload.affectation_conjointe = true;

    const { data: bureauMembers } = await supabase
      .from('profiles')
      .select('id, poste_association')
      .in('poste_association', [
        'president',
        'vice_president',
        'secretaire',
        'secretaire_adjoint',
        'tresorier',
        'tresorier_adjoint',
        'admin_ca'
      ]);

    if (bureauMembers && bureauMembers.length > 0) {
      bureauMembers.forEach(bm => {
        assigneesToInsert.push({ profile_id: bm.id, role_assignation: 'bureau' });
      });
      taskInsertPayload.assigne_a = bureauMembers[0].id;
    }
  }

  // RÈGLE C : Affectation à un MEMBRE individuel
  else if (payload.cibleType === 'membre' && payload.cibleId) {
    taskInsertPayload.assigne_a = payload.cibleId;
    assigneesToInsert.push({ profile_id: payload.cibleId, role_assignation: 'principal' });
  }

  // Insertion de la tâche dans public.taches
  const { data: newTask, error: taskErr } = await supabase
    .from('taches')
    .insert(taskInsertPayload)
    .select()
    .single();

  if (taskErr || !newTask) {
    console.error("Erreur insertion tâche:", taskErr);
    return { error: "Erreur lors de la création de la tâche." };
  }

  // Insertion des affectations conjointes dans public.taches_assignations
  if (assigneesToInsert.length > 0) {
    const records = assigneesToInsert.map(a => ({
      tache_id: newTask.id,
      profile_id: a.profile_id,
      role_assignation: a.role_assignation,
    }));

    await supabase.from('taches_assignations').insert(records);

    // Notifications aux personnes assignées
    const notificationsToInsert = assigneesToInsert.map(a => ({
      titre: `Nouvelle tâche assignée (${payload.cibleType.toUpperCase()})`,
      contenu: `Vous avez été assigné(e) conjointement à la tâche : "${payload.titre}".`,
      profile_id: a.profile_id,
    }));

    await supabase.from('notifications').insert(notificationsToInsert);
  }

  revalidatePath('/admin/taches');
  revalidatePath('/dashboard/taches');
  return { success: true, task: newTask };
}

// 3. Récupérer toutes les tâches assignées à l'utilisateur courant (directes ou conjointes)
export async function getMyGovernedTasks() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Tâches assignées directement ou via taches_assignations
  const { data: directTasks } = await supabase
    .from('taches')
    .select(`
      *,
      profiles:cree_par (prenom, nom),
      commissions:commission_id (nom),
      evenements:evenement_id (titre)
    `)
    .eq('assigne_a', user.id);

  const { data: jointAssignments } = await supabase
    .from('taches_assignations')
    .select(`
      tache_id,
      role_assignation,
      taches (
        *,
        profiles:cree_par (prenom, nom),
        commissions:commission_id (nom),
        evenements:evenement_id (titre)
      )
    `)
    .eq('profile_id', user.id);

  const tasksMap = new Map<string, any>();

  if (directTasks) {
    directTasks.forEach(t => tasksMap.set(t.id, t));
  }

  if (jointAssignments) {
    jointAssignments.forEach((ja: any) => {
      if (ja.taches) {
        tasksMap.set(ja.taches.id, { ...ja.taches, role_assignation_joint: ja.role_assignation });
      }
    });
  }

  return Array.from(tasksMap.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}
