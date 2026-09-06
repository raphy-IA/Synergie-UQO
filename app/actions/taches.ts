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
  objectifId?: string | null;
  assignesMultiples?: { profile_id: string; est_responsable_principal?: boolean }[];
}

export async function getAssignableTargets() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

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

  const { data: managedCommissions } = await supabase
    .from('commissions')
    .select('*, commission_membres(*)')
    .or(`responsable_id.eq.${user.id}`);

  const { data: commMembresRole } = await supabase
    .from('commission_membres')
    .select('commission_id, role_commission')
    .eq('profile_id', user.id)
    .in('role_commission', ['president', 'responsable', 'vice_president']);

  const managedCommIds = new Set<string>();
  if (managedCommissions) managedCommissions.forEach(c => managedCommIds.add(c.id));
  if (commMembresRole) commMembresRole.forEach(cm => managedCommIds.add(cm.commission_id));

  const isResponsableComm = managedCommIds.size > 0;

  let allowedMembersQuery = supabase
    .from('profiles')
    .select('id, prenom, nom, role, poste_association, avatar_url')
    .eq('statut_adhesion', 'approuve');

  let allowedMembers: any[] = [];

  if (isPresident) {
    const { data } = await allowedMembersQuery;
    allowedMembers = data || [];
  } else if (isVicePresident) {
    const { data } = await allowedMembersQuery;
    allowedMembers = (data || []).filter(m => (m.poste_association || '').toLowerCase() !== 'president');
  } else if (isResponsableComm) {
    const commIdsArray = Array.from(managedCommIds);
    const { data: cmList } = await supabase
      .from('commission_membres')
      .select('profile_id, profiles(id, prenom, nom, role, poste_association, avatar_url)')
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
    const { data } = await allowedMembersQuery;
    allowedMembers = data || [];
  }

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
  const isVicePresident = posteCreator === 'vice_president';

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
    objectif_id: payload.objectifId || null,
  };

  const assigneesToInsert: { profile_id: string; est_responsable_principal: boolean }[] = [];

  if (payload.assignesMultiples && payload.assignesMultiples.length > 0) {
    payload.assignesMultiples.forEach(a => {
      assigneesToInsert.push({
        profile_id: a.profile_id,
        est_responsable_principal: !!a.est_responsable_principal,
      });
    });

    if (payload.cibleType === 'commission' && payload.cibleId) {
      taskInsertPayload.commission_id = payload.cibleId;
    }
    taskInsertPayload.assigne_a = assigneesToInsert[0].profile_id;
  }
  else if (payload.cibleType === 'commission' && payload.cibleId) {
    taskInsertPayload.commission_id = payload.cibleId;
    taskInsertPayload.affectation_conjointe = true;

    const { data: comm } = await supabase
      .from('commissions')
      .select('*, commission_membres(*)')
      .eq('id', payload.cibleId)
      .single();

    if (comm) {
      if (comm.responsable_id) {
        assigneesToInsert.push({ profile_id: comm.responsable_id, est_responsable_principal: true });
      }

      const adjointMember = comm.commission_membres?.find((cm: any) => 
        ['secretaire', 'vice_president', 'adjoint', 'coresponsable'].includes((cm.role_commission || '').toLowerCase()) && cm.profile_id !== comm.responsable_id
      );

      if (adjointMember) {
        assigneesToInsert.push({ profile_id: adjointMember.profile_id, est_responsable_principal: false });
      }

      if (assigneesToInsert.length > 0) {
        taskInsertPayload.assigne_a = assigneesToInsert[0].profile_id;
      }
    }
  }
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
      bureauMembers.forEach((bm, idx) => {
        assigneesToInsert.push({ profile_id: bm.id, est_responsable_principal: idx === 0 });
      });
      taskInsertPayload.assigne_a = bureauMembers[0].id;
    }
  }
  else if (payload.cibleType === 'membre' && payload.cibleId) {
    taskInsertPayload.assigne_a = payload.cibleId;
    assigneesToInsert.push({ profile_id: payload.cibleId, est_responsable_principal: true });
  }

  const { data: newTask, error: taskErr } = await supabase
    .from('taches')
    .insert(taskInsertPayload)
    .select()
    .single();

  if (taskErr || !newTask) {
    console.error("Erreur insertion tâche:", taskErr);
    return { error: "Erreur lors de la création de la tâche." };
  }

  if (assigneesToInsert.length > 0) {
    const records = assigneesToInsert.map(a => ({
      tache_id: newTask.id,
      profile_id: a.profile_id,
      est_responsable_principal: a.est_responsable_principal,
      statut_individuel: 'a_faire',
      pourcentage_progression: 0,
    }));

    await supabase.from('tache_assignations').insert(records);

    const notificationsToInsert = assigneesToInsert.map(a => ({
      titre: `Nouvelle tâche assignée (${payload.cibleType.toUpperCase()})`,
      contenu: `Vous avez été assigné(e) à la tâche : "${payload.titre}".`,
      profile_id: a.profile_id,
    }));

    await supabase.from('notifications').insert(notificationsToInsert);
  }

  revalidatePath('/admin/taches');
  revalidatePath('/dashboard/taches');
  if (payload.cibleId) revalidatePath(`/dashboard/commissions/${payload.cibleId}`);
  return { success: true, task: newTask };
}

export async function addTaskEvolution(data: {
  tacheId: string;
  pourcentage: number;
  commentaire?: string;
  fileUrl?: string;
  fileTitre?: string;
  isCloture?: boolean;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const pct = Math.max(0, Math.min(100, Math.round(data.pourcentage)));
  const typeEv = (data.isCloture || pct === 100) ? 'cloture' : 'avancement';
  const statutIndividuel = (pct === 100 || data.isCloture) ? 'termine' : (pct > 0 ? 'en_cours' : 'a_faire');

  // 1. Insert history record in tache_evolutions
  const { error: evErr } = await supabase
    .from('tache_evolutions')
    .insert({
      tache_id: data.tacheId,
      profile_id: user.id,
      pourcentage_avancement: pct,
      commentaire: data.commentaire || null,
      file_url: data.fileUrl || null,
      file_titre: data.fileTitre || null,
      type_evolution: typeEv
    });

  if (evErr) {
    console.error("Error logging task evolution:", evErr);
  }

  // 2. Update user's progress in tache_assignations
  const { error: assErr } = await supabase
    .from('tache_assignations')
    .upsert({
      tache_id: data.tacheId,
      profile_id: user.id,
      statut_individuel: statutIndividuel,
      pourcentage_progression: pct,
      notes_avancement: data.commentaire || null,
      updated_at: new Date().toISOString()
    }, { onConflict: 'tache_id,profile_id' });

  if (assErr) {
    console.error("Error updating assignee progress:", assErr);
  }

  // 3. Recalculate aggregate progress
  const { data: assignees } = await supabase
    .from('tache_assignations')
    .select('pourcentage_progression, statut_individuel')
    .eq('tache_id', data.tacheId);

  if (assignees && assignees.length > 0) {
    const totalAvg = Math.round(
      assignees.reduce((sum, a) => sum + (a.pourcentage_progression || 0), 0) / assignees.length
    );

    const allFinished = assignees.every(a => a.statut_individuel === 'termine' || a.pourcentage_progression === 100);
    const anyStarted = assignees.some(a => a.statut_individuel === 'en_cours' || a.pourcentage_progression > 0);

    const globalStatut = allFinished ? 'termine' : anyStarted ? 'en_cours' : 'a_faire';

    await supabase
      .from('taches')
      .update({
        progression_globale: totalAvg,
        statut_global: globalStatut,
        statut: globalStatut as any,
        updated_at: new Date().toISOString()
      })
      .eq('id', data.tacheId);
  }

  revalidatePath('/dashboard/taches');
  revalidatePath(`/dashboard/taches/${data.tacheId}`);
  revalidatePath('/admin/taches');
  return { success: true };
}

export async function updateAssigneeProgress(data: {
  tacheId: string;
  pourcentage: number;
  statut?: string;
  notes?: string;
}) {
  return addTaskEvolution({
    tacheId: data.tacheId,
    pourcentage: data.pourcentage,
    commentaire: data.notes
  });
}

export async function getTaskDetails(tacheId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { data: task, error } = await supabase
    .from('taches')
    .select(`
      *,
      createur:cree_par (id, prenom, nom, avatar_url),
      commission:commission_id (id, nom, code_systeme),
      evenement:evenement_id (id, titre),
      objectif:objectif_id (
        id,
        titre,
        description,
        statut,
        missions:objectif_missions (
          mission:mission_id (id, numero_mission, titre)
        )
      ),
      assignations:tache_assignations (
        id,
        est_responsable_principal,
        statut_individuel,
        pourcentage_progression,
        notes_avancement,
        updated_at,
        profile:profile_id (
          id,
          prenom,
          nom,
          email,
          avatar_url
        )
      ),
      evolutions:tache_evolutions (
        id,
        pourcentage_avancement,
        commentaire,
        file_url,
        file_titre,
        type_evolution,
        created_at,
        auteur:profile_id (
          id,
          prenom,
          nom,
          avatar_url
        )
      )
    `)
    .eq('id', tacheId)
    .single();

  if (error || !task) {
    console.error(error);
    return { error: "Tâche introuvable." };
  }

  if (task.evolutions) {
    task.evolutions.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  return { success: true, task, currentUserId: user.id };
}

export async function getCommissionTasks(commissionId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('taches')
    .select(`
      *,
      createur:cree_par (prenom, nom),
      objectif:objectif_id (
        id,
        titre,
        statut,
        missions:objectif_missions (
          mission:mission_id (id, numero_mission, titre)
        )
      ),
      assignations:tache_assignations (
        id,
        est_responsable_principal,
        statut_individuel,
        pourcentage_progression,
        notes_avancement,
        profile:profile_id (
          id,
          prenom,
          nom,
          avatar_url
        )
      )
    `)
    .eq('commission_id', commissionId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching commission tasks:", error);
    return { success: false, error: "Erreur lors du chargement des tâches de la commission.", tasks: [] };
  }

  return { success: true, tasks: data || [] };
}

export async function getMyGovernedTasks() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: directTasks } = await supabase
    .from('taches')
    .select(`
      *,
      profiles:cree_par (prenom, nom),
      commissions:commission_id (nom),
      evenements:evenement_id (titre),
      assignations:tache_assignations (
        id,
        est_responsable_principal,
        statut_individuel,
        pourcentage_progression,
        notes_avancement,
        profile:profile_id (id, prenom, nom, avatar_url)
      )
    `)
    .eq('assigne_a', user.id);

  const { data: jointAssignments } = await supabase
    .from('tache_assignations')
    .select(`
      tache_id,
      statut_individuel,
      pourcentage_progression,
      notes_avancement,
      taches (
        *,
        profiles:cree_par (prenom, nom),
        commissions:commission_id (nom),
        evenements:evenement_id (titre),
        assignations:tache_assignations (
          id,
          est_responsable_principal,
          statut_individuel,
          pourcentage_progression,
          notes_avancement,
          profile:profile_id (id, prenom, nom, avatar_url)
        )
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
        tasksMap.set(ja.taches.id, {
          ...ja.taches,
          mon_statut_individuel: ja.statut_individuel,
          ma_progression_individuelle: ja.pourcentage_progression,
        });
      }
    });
  }

  return Array.from(tasksMap.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}
