'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { sendMail } from '@/lib/email';

export interface WorkflowSettings {
  require_commission_prevalidation: boolean;
  validation_depenses_mode: 'double' | 'seuil' | 'simple';
  validation_depenses_seuil_n2: number;
  
  // Niveaux requis (1 ou 2)
  validation_evenements_niveau: 1 | 2;
  validation_articles_niveau: 1 | 2;
  validation_votes_niveau: 1 | 2;
  validation_partenaires_niveau: 1 | 2;

  // Rôles autorisés pour valider N1 et N2 (Multi-sélection de rôles)
  roles_n1_depenses?: string[];
  roles_n2_depenses?: string[];
  double_validation_n1_depenses?: boolean;
  double_validation_n2_depenses?: boolean;

  roles_n1_evenements?: string[];
  roles_n2_evenements?: string[];
  double_validation_n1_evenements?: boolean;
  double_validation_n2_evenements?: boolean;

  roles_n1_articles?: string[];
  roles_n2_articles?: string[];
  double_validation_n1_articles?: boolean;
  double_validation_n2_articles?: boolean;

  roles_n1_votes?: string[];
  roles_n2_votes?: string[];
  double_validation_n1_votes?: boolean;
  double_validation_n2_votes?: boolean;

  roles_n1_partenaires?: string[];
  roles_n2_partenaires?: string[];
  double_validation_n1_partenaires?: boolean;
  double_validation_n2_partenaires?: boolean;

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
    require_commission_prevalidation: true,
    validation_depenses_mode: 'double',
    validation_depenses_seuil_n2: 100,
    validation_evenements_niveau: 1,
    validation_articles_niveau: 1,
    validation_votes_niveau: 1,
    validation_partenaires_niveau: 1,

    roles_n1_depenses: ['tresorier', 'vice_president'],
    roles_n2_depenses: ['president', 'vice_president'],
    double_validation_n1_depenses: false,
    double_validation_n2_depenses: false,

    roles_n1_evenements: ['secretaire', 'vice_president', 'responsable_commission'],
    roles_n2_evenements: ['president', 'vice_president'],
    double_validation_n1_evenements: false,
    double_validation_n2_evenements: false,

    roles_n1_articles: ['responsable_com', 'vice_president'],
    roles_n2_articles: ['president', 'vice_president'],
    double_validation_n1_articles: false,
    double_validation_n2_articles: false,

    roles_n1_votes: ['secretaire', 'vice_president'],
    roles_n2_votes: ['president', 'vice_president'],
    double_validation_n1_votes: false,
    double_validation_n2_votes: false,

    roles_n1_partenaires: ['responsable_partenariats', 'vice_president'],
    roles_n2_partenaires: ['president', 'vice_president'],
    double_validation_n1_partenaires: false,
    double_validation_n2_partenaires: false,

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

// 2b. Obtenir la carte des statuts de verrouillage pour les entités
export async function getEntityLockStatuses(): Promise<Record<string, { statut: string; dateEffet?: string | null; validateur?: string | null }>> {
  const supabase = createClient();
  const { data } = await supabase
    .from('validations_demandes')
    .select('type_entite, entite_id, statut_validation, date_effet_programmee, me:soumis_par(prenom, nom)');

  const map: Record<string, { statut: string; dateEffet?: string | null; validateur?: string | null }> = {};
  (data || []).forEach((v: any) => {
    map[`${v.type_entite}_${v.entite_id}`] = {
      statut: v.statut_validation,
      dateEffet: v.date_effet_programmee,
      validateur: v.me ? `${v.me.prenom} ${v.me.nom}` : null,
    };
  });
  return map;
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

  // 3. Notification aux valideurs (Bureau / Admin CA / Trésorier)
  const { data: validators } = await supabase
    .from('profiles')
    .select('id, email, prenom, nom')
    .in('role', ['admin_ca', 'superadmin', 'tresorier']);

  if (validators && validators.length > 0) {
    if (settings.notify_app_on_approval) {
      const notifs = validators.map(v => ({
        profile_id: v.id,
        titre: `Demande de validation en attente (${typeEntite.toUpperCase()})`,
        contenu: `Une nouvelle demande de validation (${typeEntite}) requiert votre examen. Cliquez pour ouvrir le Centre de Validation.`,
        link_url: '/admin/validations',
      }));

      await supabase.from('notifications').insert(notifs);
    }

    if (settings.notify_email_on_approval) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://synergie-uqo.ca';
      const loginUrl = `${appUrl}/login`;

      for (const v of validators) {
        if (v.email && v.id !== user.id) {
          try {
            await sendMail({
              to: v.email,
              subject: `Nouvelle demande de validation dans le CEDP - UQO ⚖️`,
              html: `
                <div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                  <h2 style="color: #1e3a8a; font-size: 18px;">Demande de validation en attente</h2>
                  <p>Bonjour <strong>${v.prenom || ''} ${v.nom || ''}</strong>,</p>
                  <p>Une nouvelle demande de validation (type <strong>${typeEntite.toUpperCase()}</strong>) a été soumise sur la plateforme du <strong>CEDP - UQO</strong> et requiert votre examen.</p>
                  <p style="background-color: #f8fafc; padding: 12px; border-left: 4px solid #1e3a8a; border-radius: 4px; font-style: italic; color: #475569;">
                    Veuillez vous connecter à votre espace d'administration pour examiner la demande.
                  </p>
                  <div style="margin: 24px 0; text-align: center;">
                    <a href="${loginUrl}" style="background-color: #1e3a8a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Se connecter au centre de validation</a>
                  </div>
                  <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-top: 24px;" />
                  <p style="font-size: 11px; color: #94a3b8; text-align: center;">CEDP - UQO - Message automatique système</p>
                </div>
              `,
            });
          } catch (mailErr) {
            console.error(`Erreur email validation à ${v.email}:`, mailErr);
          }
        }
      }
    }
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

  const isN1Pending = valReq.statut_validation === 'en_attente_n1' || valReq.statut_validation === 'en_attente_n1_2e_signature';
  const requiresN2 = valReq.niveau_requis === 2;

  // Déterminer les règles de double validation selon le module
  let isDoubleN1 = false;
  let isDoubleN2 = false;
  if (valReq.type_entite === 'depense') {
    isDoubleN1 = !!settings.double_validation_n1_depenses;
    isDoubleN2 = !!settings.double_validation_n2_depenses;
  } else if (valReq.type_entite === 'evenement') {
    isDoubleN1 = !!settings.double_validation_n1_evenements;
    isDoubleN2 = !!settings.double_validation_n2_evenements;
  } else if (valReq.type_entite === 'article') {
    isDoubleN1 = !!settings.double_validation_n1_articles;
    isDoubleN2 = !!settings.double_validation_n2_articles;
  } else if (valReq.type_entite === 'vote') {
    isDoubleN1 = !!settings.double_validation_n1_votes;
    isDoubleN2 = !!settings.double_validation_n2_votes;
  } else if (valReq.type_entite === 'partenaire') {
    isDoubleN1 = !!settings.double_validation_n1_partenaires;
    isDoubleN2 = !!settings.double_validation_n2_partenaires;
  }

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
    if (isN1Pending) {
      // Examen Niveau 1
      if (isDoubleN1 && valReq.statut_validation === 'en_attente_n1') {
        // Première signature enregistrée, attente de la 2ème signature N1 par un autre valideur
        nextStatutValidation = 'en_attente_n1_2e_signature';
        updatePayload.validateur_n1_id = user.id;
        updatePayload.date_validation_n1 = new Date().toISOString();
        updatePayload.commentaire_n1 = commentaire || null;
      } else {
        // N1 complètement validé (1 seule signature requise ou 2ème signature apportée)
        if (isDoubleN1) {
          // Empêcher le même valideur d'effectuer la 2ème signature N1
          if (valReq.validateur_n1_id === user.id) {
            return { error: 'La deuxième validation du Niveau 1 doit être effectuée par un autre membre habilité.' };
          }
          updatePayload.validateur_n1_bis_id = user.id;
          updatePayload.date_validation_n1_bis = new Date().toISOString();
          updatePayload.commentaire_n1_bis = commentaire || null;
        } else {
          updatePayload.validateur_n1_id = user.id;
          updatePayload.date_validation_n1 = new Date().toISOString();
          updatePayload.commentaire_n1 = commentaire || null;
        }

        // Si Niveau 2 requis, passer au Niveau 2
        if (requiresN2) {
          nextStatutValidation = 'en_attente_n2';
        } else {
          nextStatutValidation = 'approuve';
        }
      }
    } else {
      // Examen Niveau 2
      if (isDoubleN2 && valReq.statut_validation === 'en_attente_n2') {
        // Première signature enregistrée au Niveau 2, attente de la 2ème signature N2
        nextStatutValidation = 'en_attente_n2_2e_signature';
        updatePayload.validateur_n2_id = user.id;
        updatePayload.date_validation_n2 = new Date().toISOString();
        updatePayload.commentaire_n2 = commentaire || null;
      } else {
        // N2 complètement validé
        if (isDoubleN2) {
          if (valReq.validateur_n2_id === user.id) {
            return { error: 'La deuxième validation du Niveau 2 doit être effectuée par un autre membre habilité.' };
          }
          updatePayload.validateur_n2_bis_id = user.id;
          updatePayload.date_validation_n2_bis = new Date().toISOString();
          updatePayload.commentaire_n2_bis = commentaire || null;
        } else {
          updatePayload.validateur_n2_id = user.id;
          updatePayload.date_validation_n2 = new Date().toISOString();
          updatePayload.commentaire_n2 = commentaire || null;
        }
        nextStatutValidation = 'approuve';
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
  }

  // 4. Notifications & Emails à l'auteur de la soumission
  if (valReq.soumis_par) {
    let targetLinkUrl = '/dashboard';
    if (valReq.type_entite === 'evenement') targetLinkUrl = `/dashboard/evenements`;
    else if (valReq.type_entite === 'article') targetLinkUrl = `/blog`;
    else if (valReq.type_entite === 'vote') targetLinkUrl = `/dashboard/votes`;
    else if (valReq.type_entite === 'depense') targetLinkUrl = `/admin/finances`;

    const decisionLabel = nextStatutValidation === 'approuve' ? 'Approuvée' : nextStatutValidation === 'rejete' ? 'Rejetée' : 'Modifications demandées';

    if (settings.notify_app_on_approval) {
      await supabase.from('notifications').insert({
        titre: `Décision de validation : ${decisionLabel} (${valReq.type_entite.toUpperCase()})`,
        contenu: commentaire || `Votre demande de validation (${valReq.type_entite}) a fait l'objet d'une décision : ${decisionLabel}. Cliquez pour consulter.`,
        profile_id: valReq.soumis_par,
        link_url: targetLinkUrl,
      });
    }

    if (settings.notify_email_on_approval) {
      const { data: authorProfile } = await supabase
        .from('profiles')
        .select('id, email, prenom, nom')
        .eq('id', valReq.soumis_par)
        .single();

      if (authorProfile?.email) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://synergie-uqo.ca';
        const loginUrl = `${appUrl}/login`;

        try {
          await sendMail({
            to: authorProfile.email,
            subject: `Décision concernant votre demande dans le CEDP - UQO ⚖️`,
            html: `
              <div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #1e3a8a; font-size: 18px;">Décision sur votre soumission</h2>
                <p>Bonjour <strong>${authorProfile.prenom || ''} ${authorProfile.nom || ''}</strong>,</p>
                <p>Une décision a été prise concernant votre demande de validation (type <strong>${valReq.type_entite.toUpperCase()}</strong>) sur la plateforme du <strong>CEDP - UQO</strong>.</p>
                <p style="background-color: #f8fafc; padding: 12px; border-left: 4px solid #1e3a8a; border-radius: 4px; font-style: italic; color: #475569;">
                  Statut : <strong>${decisionLabel}</strong>. Pour consulter les détails ou agir sur votre dossier, veuillez vous connecter.
                </p>
                <div style="margin: 24px 0; text-align: center;">
                  <a href="${loginUrl}" style="background-color: #1e3a8a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Se connecter à mon espace</a>
                </div>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-top: 24px;" />
                <p style="font-size: 11px; color: #94a3b8; text-align: center;">CEDP - UQO - Message automatique système</p>
              </div>
            `,
          });
        } catch (mailErr) {
          console.error(`Erreur email décision validation à ${authorProfile.email}:`, mailErr);
        }
      }
    }
  }

  revalidatePath('/admin');
  return { success: true, statut_validation: nextStatutValidation };
}

// 5. Récupérer toutes les demandes de validation en attente pour le centre d'administration (filtrées selon le rôle du valideur)
export async function getPendingValidations() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  // Récupérer le profil utilisateur et ses rôles bureau
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const { data: bureauRoles } = await supabase
    .from('bureau_gouvernance')
    .select('role_bureau')
    .eq('profile_id', user.id);

  const userRoles = new Set<string>();
  if (profile?.role) userRoles.add(profile.role);
  (bureauRoles || []).forEach(b => userRoles.add(b.role_bureau));

  // Présidence & Vice-Présidence (ou superadmin) voient TOUTES les demandes
  const isGlobalSupervisor = userRoles.has('president') || 
                             userRoles.has('vice_president') || 
                             userRoles.has('superadmin') || 
                             profile?.role === 'superadmin' || 
                             profile?.role === 'admin_ca';

  const settings = await getWorkflowSettings();

  const { data, error } = await supabase
    .from('validations_demandes')
    .select(`
      *,
      profiles:soumis_par (prenom, nom, role)
    `)
    .not('statut_validation', 'in', '("approuve","rejete")')
    .order('created_at', { ascending: false });

  let results = data || [];

  // Recouvrer les dépenses directes qui sont en attente dans demandes_depenses
  try {
    const existingEntityIds = new Set(results.map((r: any) => r.entite_id));
    const { data: rawDepenses } = await supabase
      .from('demandes_depenses')
      .select(`
        id,
        titre,
        montant,
        statut,
        created_at,
        demandeur_id,
        profiles:demandeur_id (prenom, nom, role)
      `)
      .not('statut', 'in', '("paye","rejete")');

    if (rawDepenses && rawDepenses.length > 0) {
      for (const dep of rawDepenses) {
        if (!existingEntityIds.has(dep.id)) {
          results.push({
            id: `dep_${dep.id}`,
            type_entite: 'depense',
            entite_id: dep.id,
            soumis_par: dep.demandeur_id,
            statut_validation: dep.statut || 'en_attente_n1',
            niveau_requis: 1,
            created_at: dep.created_at,
            profiles: dep.profiles,
            titre_entite: `${dep.titre} (${Number(dep.montant).toFixed(2)} $ CAD)`,
          });
        }
      }
    }
  } catch (e) {
    console.warn("Error fetching fallback demandes_depenses:", e);
  }

  // Filtrer les demandes selon que l'utilisateur est habilité à statuer sur le niveau actuel
  const filteredForUser = isGlobalSupervisor 
    ? results 
    : results.filter((val: any) => {
        if (val.statut_validation === 'approuve') {
          return userRoles.has('tresorier') || userRoles.has('vice_president') || userRoles.has('president');
        }

        const isN1Stage = val.statut_validation === 'en_attente_n1' || val.statut_validation === 'en_attente_n1_2e_signature';
        
        let allowedRolesForCurrentStage: string[] = [];
        if (val.type_entite === 'depense') {
          allowedRolesForCurrentStage = isN1Stage ? (settings.roles_n1_depenses || ['tresorier', 'vice_president']) : (settings.roles_n2_depenses || ['president', 'vice_president']);
        } else if (val.type_entite === 'evenement') {
          allowedRolesForCurrentStage = isN1Stage ? (settings.roles_n1_evenements || ['secretaire', 'vice_president', 'responsable_commission']) : (settings.roles_n2_evenements || ['president', 'vice_president']);
        } else if (val.type_entite === 'article') {
          allowedRolesForCurrentStage = isN1Stage ? (settings.roles_n1_articles || ['responsable_com', 'vice_president']) : (settings.roles_n2_articles || ['president', 'vice_president']);
        } else if (val.type_entite === 'vote') {
          allowedRolesForCurrentStage = isN1Stage ? (settings.roles_n1_votes || ['secretaire', 'vice_president']) : (settings.roles_n2_votes || ['president', 'vice_president']);
        } else if (val.type_entite === 'partenaire') {
          allowedRolesForCurrentStage = isN1Stage ? (settings.roles_n1_partenaires || ['responsable_partenariats', 'vice_president']) : (settings.roles_n2_partenaires || ['president', 'vice_president']);
        }

        // Vérifier si l'utilisateur possède au moins un rôle habilité pour cette étape
        return allowedRolesForCurrentStage.some(r => userRoles.has(r));
      });

  // Enrichir avec les titres
  const enriched = await Promise.all(
    filteredForUser.map(async (val: any) => {
      if (val.titre_entite) return val;

      let titreEntite = '';
      try {
        if (val.type_entite === 'evenement') {
          const { data: item } = await supabase.from('evenements').select('titre').eq('id',val.entite_id).maybeSingle();
          titreEntite = item?.titre || '';
        } else if (val.type_entite === 'article') {
          const { data: item } = await supabase.from('articles').select('titre').eq('id', val.entite_id).maybeSingle();
          titreEntite = item?.titre || '';
        } else if (val.type_entite === 'vote') {
          const { data: item } = await supabase.from('votes').select('titre').eq('id', val.entite_id).maybeSingle();
          titreEntite = item?.titre || '';
        } else if (val.type_entite === 'partenaire') {
          const { data: item } = await supabase.from('partenaires').select('nom').eq('id', val.entite_id).maybeSingle();
          titreEntite = item?.nom || '';
        } else if (val.type_entite === 'depense') {
          const { data: item } = await supabase.from('demandes_depenses').select('titre, montant').eq('id', val.entite_id).maybeSingle();
          titreEntite = item ? `${item.titre} (${Number(item.montant).toFixed(2)} $ CAD)` : '';
        }
      } catch (e) {
        console.warn('Could not fetch title for validation entity:', val.type_entite, val.entite_id, e);
      }

      return {
        ...val,
        titre_entite: titreEntite,
      };
    })
  );

  return enriched;
}

// 6. Récupérer les détails d'une entité cible pour la prévisualisation dans le centre de validation
export async function getEntityDetails(typeEntite: string, entiteId: string) {
  const supabase = createClient();

  if (typeEntite === 'evenement') {
    const { data } = await supabase.from('evenements').select('*, commissions:commission_id(nom)').eq('id', entiteId).single();
    return data;
  } else if (typeEntite === 'article') {
    const { data } = await supabase.from('articles').select('*').eq('id', entiteId).single();
    return data;
  } else if (typeEntite === 'vote') {
    const { data: vote } = await supabase.from('votes').select('*').eq('id', entiteId).single();
    const { data: options } = await supabase.from('vote_options').select('*').eq('vote_id', entiteId);
    return { ...vote, options: options || [] };
  } else if (typeEntite === 'partenaire') {
    const { data } = await supabase.from('partenaires').select('*').eq('id', entiteId).single();
    return data;
  } else if (typeEntite === 'depense') {
    const { data } = await supabase.from('demandes_depenses').select('*').eq('id', entiteId).single();
    return data;
  }
  return null;
}
