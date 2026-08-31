'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface WorkflowSettings {
  validation_depenses_mode: 'double' | 'seuil' | 'simple';
  validation_depenses_seuil_n2: number;
  validation_evenements_niveau: 1 | 2;
  validation_articles_niveau: 1 | 2;
  validation_votes_niveau: 1 | 2;
  validation_partenaires_niveau: 1 | 2;
  notify_email_on_approval: boolean;
  notify_app_on_approval: boolean;
}

// 1. Récupérer la configuration des workflows
export async function getWorkflowSettings(): Promise<WorkflowSettings> {
  const supabase = createClient();
  const { data } = await supabase
    .from('settings_association')
    .select('value')
    .eq('key', 'workflow_settings')
    .single();

  const defaults: WorkflowSettings = {
    validation_depenses_mode: 'double',
    validation_depenses_seuil_n2: 100,
    validation_evenements_niveau: 1,
    validation_articles_niveau: 1,
    validation_votes_niveau: 1,
    validation_partenaires_niveau: 1,
    notify_email_on_approval: true,
    notify_app_on_approval: true,
  };

  if (data && data.value) {
    return { ...defaults, ...data.value };
  }
  return defaults;
}

// 2. Mettre à jour la configuration des workflows
export async function updateWorkflowSettings(settings: Partial<WorkflowSettings>) {
  const supabase = createClient();
  const current = await getWorkflowSettings();
  const updated = { ...current, ...settings };

  const { error } = await supabase
    .from('settings_association')
    .upsert({
      key: 'workflow_settings',
      value: updated,
    });

  if (error) {
    console.error('Error updating workflow settings:', error);
    return { error: 'Erreur lors de la mise à jour des paramètres de workflow.' };
  }

  revalidatePath('/admin/configuration');
  return { success: true, settings: updated };
}

// 3. Soumettre une entité pour validation (Événement, Article, Vote, Partenaire, Dépense)
export async function submitForValidation({
  typeEntite,
  entiteId,
  dateEffetProgrammee,
  montantDepense,
}: {
  typeEntite: 'evenement' | 'article' | 'vote' | 'partenaire' | 'depense';
  entiteId: string;
  dateEffetProgrammee?: string | null;
  montantDepense?: number;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Non authentifié' };
  }

  const settings = await getWorkflowSettings();

  // Déterminer le niveau requis selon la configuration
  let niveauRequis = 1;
  if (typeEntite === 'evenement') niveauRequis = settings.validation_evenements_niveau;
  else if (typeEntite === 'article') niveauRequis = settings.validation_articles_niveau;
  else if (typeEntite === 'vote') niveauRequis = settings.validation_votes_niveau;
  else if (typeEntite === 'partenaire') niveauRequis = settings.validation_partenaires_niveau;
  else if (typeEntite === 'depense') {
    if (settings.validation_depenses_mode === 'double') {
      niveauRequis = 2;
    } else if (settings.validation_depenses_mode === 'seuil') {
      niveauRequis = (montantDepense || 0) >= settings.validation_depenses_seuil_n2 ? 2 : 1;
    } else {
      niveauRequis = 1;
    }
  }

  // 1. Créer la demande dans validations_demandes
  const { data: validation, error: valError } = await supabase
    .from('validations_demandes')
    .insert({
      type_entite: typeEntite,
      entite_id: entiteId,
      soumis_par: user.id,
      statut_validation: 'en_attente_n1',
      niveau_requis: niveauRequis,
      date_effet_programmee: dateEffetProgrammee ? new Date(dateEffetProgrammee).toISOString() : null,
    })
    .select()
    .single();

  if (valError || !validation) {
    console.error('Error submitting validation:', valError);
    return { error: 'Erreur lors de la soumission de la demande de validation.' };
  }

  // 2. Mettre à jour le statut de l'entité cible
  if (typeEntite === 'evenement') {
    await supabase.from('evenements').update({ statut: 'brouillon' }).eq('id', entiteId);
  } else if (typeEntite === 'article') {
    await supabase.from('articles').update({ statut: 'brouillon' }).eq('id', entiteId);
  } else if (typeEntite === 'vote') {
    await supabase.from('votes').update({ statut: 'planifie' }).eq('id', entiteId);
  } else if (typeEntite === 'partenaire') {
    await supabase.from('partenaires').update({ actif: false }).eq('id', entiteId);
  } else if (typeEntite === 'depense') {
    await supabase.from('demandes_depenses').update({ statut: 'en_attente_n1' }).eq('id', entiteId);
  }

  // 3. Notification interne automatique aux valides (Trésorier/Secrétaire/Présidence)
  if (settings.notify_app_on_approval) {
    await supabase.from('notifications').insert({
      titre: `Nouvelle demande de validation (${typeEntite.toUpperCase()})`,
      contenu: `Une demande requérant votre examen a été soumise.`,
      profile_id: user.id,
    });
  }

  revalidatePath('/admin');
  return { success: true, validation };
}

// 4. Traiter une décision de validation (Niveau 1 ou 2)
export async function processValidationDecision({
  validationId,
  decision, // 'approuve' | 'rejete' | 'modifications_demandees'
  commentaire,
  dateEffet,
}: {
  validationId: string;
  decision: 'approuve' | 'rejete' | 'modifications_demandees';
  commentaire?: string;
  dateEffet?: string | null;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Non authentifié' };

  // Charger la demande de validation
  const { data: valReq } = await supabase
    .from('validations_demandes')
    .select('*')
    .eq('id', validationId)
    .single();

  if (!valReq) return { error: 'Demande de validation introuvable' };

  const settings = await getWorkflowSettings();

  const isN1Pending = valReq.statut_validation === 'en_attente_n1';
  const requiresN2 = valReq.niveau_requis === 2;

  let nextStatutValidation = valReq.statut_validation;
  const updatePayload: any = {
    updated_at: new Date().toISOString(),
  };

  if (dateEffet) {
    updatePayload.date_effet_programmee = new Date(dateEffet).toISOString();
  }

  if (decision === 'rejete' || decision === 'modifications_demandees') {
    nextStatutValidation = decision;
    if (isN1Pending) {
      updatePayload.validateur_n1_id = user.id;
      updatePayload.date_validation_n1 = new Date().toISOString();
      updatePayload.commentaire_n1 = commentaire || null;
    } else {
      updatePayload.validateur_n2_id = user.id;
      updatePayload.date_validation_n2 = new Date().toISOString();
      updatePayload.commentaire_n2 = commentaire || null;
    }
  } else if (decision === 'approuve') {
    if (isN1Pending && requiresN2) {
      // Passer au Niveau 2
      nextStatutValidation = 'en_attente_n2';
      updatePayload.validateur_n1_id = user.id;
      updatePayload.date_validation_n1 = new Date().toISOString();
      updatePayload.commentaire_n1 = commentaire || null;
    } else {
      // Validation finale complète
      nextStatutValidation = 'approuve';
      if (isN1Pending) {
        updatePayload.validateur_n1_id = user.id;
        updatePayload.date_validation_n1 = new Date().toISOString();
        updatePayload.commentaire_n1 = commentaire || null;
      } else {
        updatePayload.validateur_n2_id = user.id;
        updatePayload.date_validation_n2 = new Date().toISOString();
        updatePayload.commentaire_n2 = commentaire || null;
      }
    }
  }

  updatePayload.statut_validation = nextStatutValidation;

  const { error: valUpdateErr } = await supabase
    .from('validations_demandes')
    .update(updatePayload)
    .eq('id', validationId);

  if (valUpdateErr) {
    console.error(valUpdateErr);
    return { error: 'Erreur lors de la mise à jour de la décision.' };
  }

  // Exécution de l'impact sur l'entité cible si APPROUVÉ FINALEMENT
  if (nextStatutValidation === 'approuve') {
    const entiteId = valReq.entite_id;

    if (valReq.type_entite === 'evenement') {
      await supabase.from('evenements').update({ statut: 'publie' }).eq('id', entiteId);
    } else if (valReq.type_entite === 'article') {
      await supabase.from('articles').update({ statut: 'publie' }).eq('id', entiteId);
    } else if (valReq.type_entite === 'vote') {
      await supabase.from('votes').update({ statut: 'actif' }).eq('id', entiteId);
    } else if (valReq.type_entite === 'partenaire') {
      await supabase.from('partenaires').update({ actif: true }).eq('id', entiteId);
    } else if (valReq.type_entite === 'depense') {
      await supabase.from('demandes_depenses').update({ statut: 'approuve' }).eq('id', entiteId);
    }

    // Notification à l'auteur
    if (settings.notify_app_on_approval && valReq.soumis_par) {
      await supabase.from('notifications').insert({
        titre: `Demande de validation approuvée (${valReq.type_entite.toUpperCase()})`,
        contenu: `Votre demande a été validée avec succès.`,
        profile_id: valReq.soumis_par,
      });
    }
  } else if (nextStatutValidation === 'rejete' || nextStatutValidation === 'modifications_demandees') {
    if (settings.notify_app_on_approval && valReq.soumis_par) {
      await supabase.from('notifications').insert({
        titre: `Décision sur votre demande (${valReq.type_entite.toUpperCase()}) : ${nextStatutValidation}`,
        contenu: commentaire || `Une décision a été prise concernant votre soumission.`,
        profile_id: valReq.soumis_par,
      });
    }
  }

  revalidatePath('/admin');
  return { success: true, statut_validation: nextStatutValidation };
}

// 5. Récupérer toutes les demandes de validation en attente pour le centre d'administration
export async function getPendingValidations() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('validations_demandes')
    .select(`
      *,
      profiles:soumis_par (prenom, nom, role)
    `)
    .in('statut_validation', ['en_attente_n1', 'en_attente_n2'])
    .order('created_at', { ascending: false });

  if (error) console.error(error);
  return data || [];
}
