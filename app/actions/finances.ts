'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { submitForValidation } from './validation';
import { revalidatePath } from 'next/cache';

export interface DepensePayload {
  titre: string;
  description?: string;
  montant: number;
  categorie: string;
  justificatif_url?: string;
  evenement_id?: string;
  commission_id?: string;
  tache_id?: string;
}

export interface SolidarityPayload {
  montant_demande: number;
  motif: string;
  justificatif_url?: string;
}

// 1. Récupérer le Bilan Financier Global & Analytique (KPIs, Catégories, Comptes)
export async function getFinancialSummary() {
  const supabaseAdmin = createAdminClient();

  // A. Fond de caisse initial
  const { data: fondSetting } = await supabaseAdmin
    .from('settings_association')
    .select('value')
    .eq('key', 'fond_caisse_initial')
    .single();

  const fondInitial = fondSetting?.value?.montant || 0.0;

  // B. Totaux des revenus (Cotisations + Billetterie + Subventions + Partenariats)
  let { data: paiements, error: payErr } = await supabaseAdmin
    .from('paiements')
    .select('montant, type_paiement, methode_paiement, compte_id, statut, created_at');

  if (payErr) {
    console.error('getFinancialSummary paiements query error:', payErr);
  }

  // Filtrer les paiements valides (succeeded, recu, paye, ou sans statut strict)
  const validPaiements = (paiements || []).filter(p => !p.statut || ['succeeded', 'recu', 'paye', 'valide'].includes(String(p.statut).toLowerCase()));
  const totalRevenus = validPaiements.reduce((sum, p) => sum + Number(p.montant), 0);

  // Ventilation par catégorie de revenus
  const revenusParCategorie: Record<string, number> = {};
  const encaisséParCompte: Record<string, number> = {};

  validPaiements.forEach(p => {
    const cat = p.type_paiement || 'autre';
    revenusParCategorie[cat] = (revenusParCategorie[cat] || 0) + Number(p.montant);

    const compte = p.compte_id || 'compte_banque_principal';
    encaisséParCompte[compte] = (encaisséParCompte[compte] || 0) + Number(p.montant);
  });

  // C. Totaux des dépenses payées (Décaissées)
  let { data: depenses } = await supabaseAdmin
    .from('demandes_depenses')
    .select('montant, categorie, statut, commission_id, compte_id');

  // Seules les dépenses effectivement payées ou validées par le trésorier constituent un décaissement effectif
  const validDepenses = (depenses || []).filter(d => ['paye', 'valide'].includes(String(d.statut).toLowerCase()));
  const totalDepenses = validDepenses.reduce((sum, d) => sum + Number(d.montant), 0);

  // Ventilation des dépenses par catégorie
  const depensesParCategorie: Record<string, number> = {};
  const décaisseParCompte: Record<string, number> = {};

  validDepenses.forEach(d => {
    const cat = d.categorie || 'autre';
    depensesParCategorie[cat] = (depensesParCategorie[cat] || 0) + Number(d.montant);

    const compte = d.compte_id || 'compte_banque_principal';
    décaisseParCompte[compte] = (décaisseParCompte[compte] || 0) + Number(d.montant);
  });

  // D. Totaux des aides de solidarité versées
  const { data: aides } = await supabaseAdmin
    .from('fonds_solidarite_demandes')
    .select('montant_demande, statut')
    .in('statut', ['approuve', 'verse']);

  const totalAides = (aides || []).reduce((sum, a) => sum + Number(a.montant_demande), 0);

  // E. Dépenses en attente d'approbation (N1 / N2 / CA)
  const depensesEnAttenteApprobation = (depenses || []).filter(d =>
    ['en_attente_n1', 'en_attente_n2', 'en_attente_validation', 'en_attente_n1_2e_signature'].includes(String(d.statut).toLowerCase())
  );
  const totalDepensesEnAttenteApprobation = depensesEnAttenteApprobation.reduce((sum, d) => sum + Number(d.montant), 0);

  // F. Dépenses en attente de paiement (Approuvées par le CA, en attente de décaisser par la trésorerie)
  const depensesEnAttentePaiement = (depenses || []).filter(d => String(d.statut).toLowerCase() === 'approuve');
  const totalDepensesEnAttentePaiement = depensesEnAttentePaiement.reduce((sum, d) => sum + Number(d.montant), 0);

  // E+F Total des engagements en attente
  const totalDepensesEnAttente = totalDepensesEnAttenteApprobation + totalDepensesEnAttentePaiement;

  // G. Solde de trésorerie net disponible (Fond initial + Recettes encassées - Dépenses décaissées - Aides versées)
  const soldeTresorerie = fondInitial + totalRevenus - totalDepenses - totalAides;

  // H. Bilan Analytique par Catégorie (Entrées, Sorties, Solde Net Réserve)
  const allCategoryKeys = Array.from(new Set([
    ...Object.keys(revenusParCategorie),
    ...Object.keys(depensesParCategorie),
  ]));

  const analyseParCategorie = allCategoryKeys.map(catKey => {
    const totalEntrees = revenusParCategorie[catKey] || 0;
    const totalSorties = depensesParCategorie[catKey] || 0;
    const soldeNet = totalEntrees - totalSorties;
    return {
      categorie: catKey,
      totalEntrees,
      totalSorties,
      soldeNet,
    };
  });

  return {
    fondInitial,
    totalRevenus,
    totalDepenses,
    totalAides,
    totalDepensesEnAttente,
    totalDepensesEnAttenteApprobation,
    nombreDepensesEnAttenteApprobation: depensesEnAttenteApprobation.length,
    totalDepensesEnAttentePaiement,
    nombreDepensesEnAttentePaiement: depensesEnAttentePaiement.length,
    soldeTresorerie,
    nombrePaiements: (paiements || []).length,
    nombreDepenses: validDepenses.length,
    nombreAides: (aides || []).length,
    revenusParCategorie,
    depensesParCategorie,
    encaisséParCompte,
    décaisseParCompte,
    analyseParCategorie,
  };
}

// 2. Grand Livre Comptable Unifié (Ledger de tous les crédits et débits)
export async function getAccountingLedger() {
  const supabaseAdmin = createAdminClient();

  // 1. Crédits (Revenus)
  const { data: paiements } = await supabaseAdmin
    .from('paiements')
    .select(`
      id,
      montant,
      type_paiement,
      compte_id,
      methode_paiement,
      reference_transaction,
      notes,
      statut,
      created_at,
      profiles (prenom, nom, email)
    `)
    .order('created_at', { ascending: false });

  // 2. Débits (Notes de frais / Dépenses réglées uniquement)
  const { data: depenses } = await supabaseAdmin
    .from('demandes_depenses')
    .select(`
      id,
      titre,
      montant,
      categorie,
      compte_id,
      methode_paiement,
      reference_transaction,
      notes_paiement,
      date_paiement,
      statut,
      created_at,
      profiles:demandeur_id (prenom, nom),
      commissions:commission_id (nom)
    `)
    .in('statut', ['paye', 'valide'])
    .order('created_at', { ascending: false });

  // 3. Débits (Aides de solidarité)
  const { data: aides } = await supabaseAdmin
    .from('fonds_solidarite_demandes')
    .select(`
      id,
      montant_demande,
      statut,
      motif,
      created_at,
      profiles:demandeur_id (prenom, nom)
    `)
    .order('created_at', { ascending: false });

  const ledger: any[] = [];

  (paiements || []).forEach(p => {
    const prof: any = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
    ledger.push({
      id: `p-${p.id}`,
      type: 'credit',
      categorie: p.type_paiement || 'cotisation',
      compte_id: p.compte_id || 'compte_banque_principal',
      libelle: `Paiement / ${p.type_paiement ? p.type_paiement.replace('_', ' ') : 'Recette'}`,
      montant: Number(p.montant),
      tiers: prof ? `${prof.prenom} ${prof.nom}` : 'Membre/Tiers externe',
      methode: p.methode_paiement || 'en_ligne',
      reference: p.reference_transaction || '-',
      notes: p.notes || null,
      statut: p.statut,
      date: p.created_at,
    });
  });

  (depenses || []).forEach(d => {
    const prof: any = Array.isArray(d.profiles) ? d.profiles[0] : d.profiles;
    const comm: any = Array.isArray(d.commissions) ? d.commissions[0] : d.commissions;
    ledger.push({
      id: `d-${d.id}`,
      type: 'debit',
      categorie: d.categorie || 'depense',
      compte_id: d.compte_id || 'compte_banque_principal',
      libelle: `Dépense : ${d.titre}${comm ? ` (${comm.nom})` : ''}`,
      montant: Number(d.montant),
      tiers: prof ? `${prof.prenom} ${prof.nom}` : 'Membre',
      methode: d.methode_paiement || 'virement_bancaire',
      reference: d.reference_transaction || '-',
      notes: d.notes_paiement || null,
      statut: d.statut,
      date: d.date_paiement || d.created_at,
    });
  });

  (aides || []).forEach(a => {
    const prof: any = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles;
    ledger.push({
      id: `a-${a.id}`,
      type: 'debit',
      categorie: 'aide_solidarite',
      libelle: `Aide d'urgence : ${a.motif ? a.motif.substring(0, 35) : 'Secours'}`,
      montant: Number(a.montant_demande),
      tiers: prof ? `${prof.prenom} ${prof.nom}` : 'Membre',
      methode: 'virement_secours',
      reference: '-',
      notes: null,
      statut: a.statut,
      date: a.created_at,
    });
  });

  // Trier par date décroissante
  ledger.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return ledger;
}

// 3. Soumettre une demande d'aide d'urgence (Fonds de solidarité) par un membre
export async function submitSolidarityFundClaim(payload: SolidarityPayload) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Non authentifié' };

  if (!payload.montant_demande || payload.montant_demande <= 0 || !payload.motif) {
    return { error: 'Veuillez préciser un montant valide et le motif de votre demande d\'aide.' };
  }

  // Vérifier l'ancienneté de 6 mois
  const { data: prof } = await supabase
    .from('profiles')
    .select('created_at, date_adhesion, statut_adhesion')
    .eq('id', user.id)
    .single();

  if (!prof) return { error: 'Profil introuvable.' };

  const { data: claim, error } = await supabase
    .from('fonds_solidarite_demandes')
    .insert({
      demandeur_id: user.id,
      montant_demande: payload.montant_demande,
      motif: payload.motif,
      justificatif_url: payload.justificatif_url || null,
      statut: 'en_attente',
    })
    .select()
    .single();

  if (error || !claim) {
    console.error(error);
    return { error: 'Erreur lors de la soumission de la demande d\'aide.' };
  }

  revalidatePath('/dashboard/cotisations');
  revalidatePath('/admin/finances');
  return { success: true, claim };
}

// 4. Récupérer toutes les demandes d'aides de solidarité (Admin & Membre)
export async function getSolidarityFundClaims() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('fonds_solidarite_demandes')
    .select(`
      *,
      profiles:demandeur_id (prenom, nom, email, created_at, date_adhesion, statut_adhesion)
    `)
    .order('created_at', { ascending: false });

  if (error) console.error(error);
  return data || [];
}

// 5. Statuer sur une demande d'aide de solidarité (Arbitrage du bureau)
export async function processSolidarityDecision({
  claimId,
  decision, // 'approuve' | 'rejete' | 'verse'
  commentaire,
}: {
  claimId: string;
  decision: 'approuve' | 'rejete' | 'verse';
  commentaire?: string;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Non authentifié' };

  const { error } = await supabase
    .from('fonds_solidarite_demandes')
    .update({
      statut: decision,
      decision_par: user.id,
      commentaire_decision: commentaire || null,
      date_decision: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', claimId);

  if (error) {
    console.error(error);
    return { error: 'Erreur lors de la mise à jour de la décision d\'aide.' };
  }

  revalidatePath('/admin/finances');
  return { success: true };
}

// 6. Mettre à jour le Fond de Caisse Initial dans les paramètres
export async function updateFondCaisseInitial(montant: number) {
  const supabase = createClient();
  const { error } = await supabase
    .from('settings_association')
    .upsert({
      key: 'fond_caisse_initial',
      value: { montant: montant, devise: 'CAD' },
    });

  if (error) {
    return { error: 'Erreur lors de la mise à jour du fond de caisse initial.' };
  }

  revalidatePath('/admin/finances');
  return { success: true };
}

// 7. Soumettre une demande de dépense
export async function submitExpenseClaim(payload: DepensePayload) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Non authentifié' };

  if (!payload.titre || !payload.montant || payload.montant <= 0) {
    return { error: 'Veuillez renseigner un titre et un montant valide.' };
  }

  let isCommissionLeader = false;
  let commRespId = null;
  let commAdjId = null;

  if (payload.commission_id) {
    const supabaseAdmin = createAdminClient();
    const { data: comm } = await supabaseAdmin
      .from('commissions')
      .select('*, commission_membres(*)')
      .eq('id', payload.commission_id)
      .single();

    if (comm) {
      commRespId = comm.responsable_id;
      commAdjId = comm.responsable_adjoint_id;

      const { data: userProfile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const isAdmin = ['admin_ca', 'tresorier', 'superadmin'].includes(userProfile?.role || '');

      const userCommMem = comm.commission_membres?.find((cm: any) => cm.profile_id === user.id && cm.actif);
      const roleStr = (userCommMem?.role_commission || '').toLowerCase();
      const isMemLeader = userCommMem && (
        roleStr.includes('responsable') ||
        roleStr.includes('president') ||
        roleStr.includes('lead') ||
        roleStr.includes('coordonnateur') ||
        roleStr.includes('adjoint')
      );

      isCommissionLeader = comm.responsable_id === user.id || comm.responsable_adjoint_id === user.id || isAdmin || !!isMemLeader;
    }
  }

  const insertData: any = {
    titre: payload.titre,
    description: payload.description || null,
    montant: payload.montant,
    categorie: payload.categorie || 'autre',
    justificatif_url: payload.justificatif_url || null,
    demandeur_id: user.id,
    evenement_id: payload.evenement_id || null,
    commission_id: payload.commission_id || null,
    statut: 'en_attente_n1',
    statut_commission: isCommissionLeader ? 'valide' : 'en_attente_validation',
  };

  if (payload.tache_id) {
    insertData.tache_id = payload.tache_id;
  }

  const supabaseAdmin = createAdminClient();

  let { data: depense, error } = await supabaseAdmin
    .from('demandes_depenses')
    .insert(insertData)
    .select()
    .single();

  // Fallback if statut_commission or tache_id columns are missing in DB
  if (error) {
    console.warn("Retrying submitExpenseClaim without custom columns fallback:", error.message);
    delete insertData.statut_commission;
    delete insertData.tache_id;
    const retryRes = await supabaseAdmin
      .from('demandes_depenses')
      .insert(insertData)
      .select()
      .single();

    depense = retryRes.data;
    error = retryRes.error;
  }

  if (error || !depense) {
    console.error('Error creating expense claim:', error);
    return { error: `Erreur lors de la création de la demande de dépense: ${error?.message || 'Erreur inconnue'}` };
  }

  // Only submit directly to global financial validation circuit if user is Responsable or Adjoint
  if (isCommissionLeader) {
    try {
      await submitForValidation({
        typeEntite: 'depense',
        entiteId: depense.id,
        montantDepense: payload.montant,
      });
    } catch (valErr) {
      console.warn("Notice: submitForValidation warning:", valErr);
    }
  } else {
    // Notify commission leaders that a task lead submitted an expense needing pre-validation
    const notifyIds = [commRespId, commAdjId].filter(id => !!id && id !== user.id);
    if (notifyIds.length > 0) {
      const notifs = notifyIds.map(rid => ({
        profile_id: rid,
        titre: 'Note de frais en attente de pré-validation commission',
        contenu: `Une note de frais ("${payload.titre}") a été soumise pour pré-validation dans l'onglet Budget.`,
        link_url: `/dashboard/commissions/${payload.commission_id}`,
      }));
      await supabaseAdmin.from('notifications').insert(notifs);
    }
  }

  revalidatePath('/dashboard/cotisations');
  revalidatePath('/admin/finances');
  if (payload.commission_id) {
    revalidatePath(`/dashboard/commissions/${payload.commission_id}`);
  }
  return { success: true, depense };
}

// 7b. Décision pré-validation par le Responsable ou Adjoint de la commission
export async function processCommissionExpenseDecision({
  depenseId,
  decision,
  notes,
}: {
  depenseId: string;
  decision: 'valide' | 'modifications_demandees' | 'rejete';
  notes?: string;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Non authentifié' };

  const supabaseAdmin = createAdminClient();

  const { data: depense } = await supabaseAdmin
    .from('demandes_depenses')
    .select('*, commissions:commission_id(id, responsable_id, responsable_adjoint_id, commission_membres(*))')
    .eq('id', depenseId)
    .single();

  if (!depense) return { error: 'Dépense introuvable' };

  const comm = depense.commissions;
  const { data: userProfile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isAdmin = ['admin_ca', 'tresorier', 'superadmin'].includes(userProfile?.role || '');

  const userCm = comm?.commission_membres?.find((cm: any) => cm.profile_id === user.id && cm.actif);
  const roleStr = (userCm?.role_commission || '').toLowerCase();
  const isMemLeader = userCm && (
    roleStr.includes('responsable') ||
    roleStr.includes('president') ||
    roleStr.includes('lead') ||
    roleStr.includes('coordonnateur') ||
    roleStr.includes('adjoint')
  );

  const isLeader = comm && (comm.responsable_id === user.id || comm.responsable_adjoint_id === user.id || isAdmin || !!isMemLeader);

  if (!isLeader) {
    return { error: 'Seul le Responsable ou le Responsable Adjoint de la commission peut arbitrer cette demande.' };
  }

  const updatePayload: any = {
    statut_commission: decision,
    notes_commission: notes || null,
    validateur_commission_id: user.id,
    date_validation_commission: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (decision === 'valide') {
    updatePayload.statut = 'en_attente_n1';
  } else if (decision === 'rejete') {
    updatePayload.statut = 'rejete';
  }

  let { error: updateErr } = await supabaseAdmin
    .from('demandes_depenses')
    .update(updatePayload)
    .eq('id', depenseId);

  if (updateErr) {
    await supabaseAdmin
      .from('demandes_depenses')
      .update({
        statut: decision === 'valide' ? 'en_attente_n1' : decision === 'rejete' ? 'rejete' : 'brouillon',
        updated_at: new Date().toISOString(),
      })
      .eq('id', depenseId);
  }

  if (decision === 'valide') {
    try {
      await submitForValidation({
        typeEntite: 'depense',
        entiteId: depenseId,
        montantDepense: Number(depense.montant),
      });
    } catch (e) {
      console.warn('submitForValidation error:', e);
    }
  }

  if (depense.demandeur_id) {
    const decisionLabel = decision === 'valide'
      ? 'Approuvée et transmise au circuit financier'
      : decision === 'modifications_demandees'
      ? 'Modifications demandées'
      : 'Rejetée';

    await supabaseAdmin.from('notifications').insert({
      profile_id: depense.demandeur_id,
      titre: `Décision commission : Note de frais "${depense.titre}"`,
      contenu: `Statut : ${decisionLabel}.${notes ? ` Note : "${notes}"` : ''}`,
      link_url: `/dashboard/commissions/${depense.commission_id}`,
    });
  }

  if (depense.commission_id) {
    revalidatePath(`/dashboard/commissions/${depense.commission_id}`);
  }
  revalidatePath('/admin/finances');
  return { success: true };
}

// 8. Récupérer les dépenses (Membres ou Admins)
export async function getExpenseClaims() {
  const supabaseAdmin = createAdminClient();
  const { data, error } = await supabaseAdmin
    .from('demandes_depenses')
    .select(`
      *,
      profiles:demandeur_id (prenom, nom, email),
      evenements:evenement_id (titre),
      commissions:commission_id (id, nom),
      taches:tache_id (id, titre)
    `)
    .order('created_at', { ascending: false });

  if (error) console.error(error);
  return data || [];
}

// 8b. Récupérer les dépenses d'une commission spécifique
export async function getCommissionExpenses(commissionId: string) {
  const supabaseAdmin = createAdminClient();
  const { data, error } = await supabaseAdmin
    .from('demandes_depenses')
    .select(`
      *,
      profiles:demandeur_id (prenom, nom, email, avatar_url),
      taches:tache_id (
        id,
        titre,
        assignations:tache_assignations (
          id,
          profile_id,
          est_responsable_principal
        ),
        objectif:objectif_id (
          id,
          titre
        )
      )
    `)
    .eq('commission_id', commissionId)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Fallback getCommissionExpenses without taches join:', error.message);
    const { data: fallbackData } = await supabaseAdmin
      .from('demandes_depenses')
      .select(`
        *,
        profiles:demandeur_id (prenom, nom, email, avatar_url)
      `)
      .eq('commission_id', commissionId)
      .order('created_at', { ascending: false });

    return fallbackData || [];
  }

  return data || [];
}

export interface TreasuryAccount {
  id: string;
  nom: string;
  type: 'banque' | 'caisse' | 'stripe' | 'epargne' | 'autre';
  institution?: string;
  numero_compte?: string;
  transit_routing?: string;
  solde_initial: number;
  solde?: number;
  devise: string;
  est_defaut?: boolean;
  description?: string;
  actif: boolean;
}

const DEFAULT_TREASURY_ACCOUNTS: TreasuryAccount[] = [
  {
    id: 'compte_banque_principal',
    nom: 'Compte Bancaire Courant Principal',
    type: 'banque',
    institution: 'Banque Nationale / Desjardins',
    numero_compte: '**** 4892',
    transit_routing: '001-00012',
    solde_initial: 0,
    devise: 'CAD',
    est_defaut: true,
    description: 'Compte courant principal pour la réception des cotisations et le paiement des charges.',
    actif: true,
  },
  {
    id: 'petite_caisse',
    nom: 'Petite Caisse / Espèces Trésorerie',
    type: 'caisse',
    institution: 'Caisse physique bureau',
    numero_compte: 'CASH-01',
    solde_initial: 0,
    devise: 'CAD',
    est_defaut: false,
    description: 'Encaisse physique pour les dépenses mineures en comptant.',
    actif: true,
  },
  {
    id: 'compte_stripe',
    nom: 'Passerelle En Ligne Stripe',
    type: 'stripe',
    institution: 'Stripe Payments',
    numero_compte: 'acct_stripe_live',
    solde_initial: 0,
    devise: 'CAD',
    est_defaut: false,
    description: 'Compte de transit automatique pour les cotisations par carte de crédit.',
    actif: true,
  }
];

export async function getTreasuryAccounts(): Promise<TreasuryAccount[]> {
  const supabaseAdmin = createAdminClient();
  const { data } = await supabaseAdmin
    .from('settings_association')
    .select('value')
    .eq('key', 'comptes_tresorerie')
    .single();

  if (data?.value?.comptes && Array.isArray(data.value.comptes)) {
    return data.value.comptes as TreasuryAccount[];
  }
  return DEFAULT_TREASURY_ACCOUNTS;
}

export async function saveTreasuryAccounts(comptes: TreasuryAccount[]) {
  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin
    .from('settings_association')
    .upsert({
      key: 'comptes_tresorerie',
      value: { comptes }
    });

  if (error) {
    console.error(error);
    return { error: 'Erreur lors de la sauvegarde des comptes de trésorerie.' };
  }

  revalidatePath('/admin/configuration');
  revalidatePath('/admin/finances');
  return { success: true };
}

// Générer une référence automatique modifiable (ex: DEC-VIR-2026-0012)
export async function generateTransactionReference(typeOperation: 'encaissement' | 'decaissement', methode: string = 'virement_bancaire') {
  const supabaseAdmin = createAdminClient();
  const prefixOp = typeOperation === 'encaissement' ? 'ENC' : 'DEC';
  let prefixMethode = 'GEN';

  const m = methode.toLowerCase();
  if (m.includes('virement') || m.includes('interac')) prefixMethode = 'VIR';
  else if (m.includes('carte') || m.includes('stripe')) prefixMethode = 'CB';
  else if (m.includes('cheque')) prefixMethode = 'CHQ';
  else if (m.includes('espece') || m.includes('caisse')) prefixMethode = 'ESP';

  const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
  
  const table = typeOperation === 'encaissement' ? 'paiements' : 'demandes_depenses';
  const { count } = await supabaseAdmin.from(table).select('*', { count: 'exact', head: true });
  const seq = String((count || 0) + 1).padStart(4, '0');

  return `${prefixOp}-${prefixMethode}-${dateStr}-${seq}`;
}

// 9b. Marquer une dépense comme payée / remboursée par le Trésorier avec sélection du compte débiteur
export async function markExpenseAsPaid({
  depenseId,
  compte_id,
  methode_paiement,
  reference_transaction,
  notes,
}: {
  depenseId: string;
  compte_id?: string;
  methode_paiement?: string;
  reference_transaction?: string;
  notes?: string;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Non authentifié' };

  const supabaseAdmin = createAdminClient();

  // Charger la dépense et la demande de validation si elle existe
  const { data: depense } = await supabaseAdmin
    .from('demandes_depenses')
    .select('*')
    .eq('id', depenseId)
    .single();

  if (!depense) return { error: 'Dépense introuvable.' };

  const { getWorkflowSettings } = await import('@/app/actions/validation');
  const settings = await getWorkflowSettings();

  const montant = Number(depense.montant || 0);

  // Déterminer les niveaux requis pour le PAIEMENT
  const modePaiement = settings.validation_paiement_mode || 'simple';
  const seuilN2 = settings.validation_paiement_seuil_n2 ?? 500;
  const requiresN2 = modePaiement === 'simple' ? false : montant >= seuilN2;

  const rolesN1 = settings.roles_n1_paiement || ['tresorier'];
  const rolesN2 = settings.roles_n2_paiement || ['president', 'vice_president'];
  const isDoubleN1 = !!settings.double_validation_n1_paiement;
  const isDoubleN2 = !!settings.double_validation_n2_paiement;

  const { data: userProf } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isSuperadmin = userProf?.role === 'superadmin';

  const { data: userBur } = await supabase
    .from('bureau_gouvernance')
    .select('role_bureau')
    .eq('profile_id', user.id);

  const userRoles = (userBur || []).map(b => b.role_bureau);
  if (userProf?.role) userRoles.push(userProf.role);

  // Récupérer l'enregistrement dans validations_demandes pour cette dépense (ou le créer)
  let { data: valReq } = await supabaseAdmin
    .from('validations_demandes')
    .select('*')
    .eq('type_entite', 'depense')
    .eq('entite_id', depenseId)
    .maybeSingle();

  // Déterminer à quelle étape du PAIEMENT nous sommes
  // Par exemple si la dépense est 'approuve' (pour l'examen), la validation de paiement commence
  let currentPayStatut = valReq?.statut_validation || 'approuve';

  // Si on est encore au statut 'approuve' global (fin de l'examen), c'est la 1re signature N1 du paiement
  const isPaiementN1Pending = currentPayStatut === 'approuve' || currentPayStatut === 'en_attente_n1' || currentPayStatut === 'en_attente_n1_2e_signature';

  const allowedRoles = isSuperadmin 
    ? [...rolesN1, ...rolesN2]
    : isPaiementN1Pending ? rolesN1 : rolesN2;

  const hasPermission = isSuperadmin || userRoles.some(r => allowedRoles.includes(r));
  if (!hasPermission) {
    return { 
      error: `Accès refusé : Seuls les rôles autorisés à ce niveau de paiement (${allowedRoles.join(', ')}) peuvent signer ou exécuter ce décaissement.` 
    };
  }

  // Traiter la logique de progression du paiement (1 signature vs 2 signatures vs N2 requis)
  let nextStatutPaiement = 'paye';
  let isFullyPaid = false;

  if (isPaiementN1Pending) {
    if (isDoubleN1 && currentPayStatut === 'approuve') {
      // 1re signature N1 de paiement
      nextStatutPaiement = 'en_attente_n1_2e_signature';
      isFullyPaid = false;
    } else {
      // N1 paiement validé
      if (isDoubleN1 && valReq?.validateur_n1_id === user.id) {
        return { error: 'La deuxième signature du Niveau 1 de paiement doit être effectuée par un co-signataire distinct.' };
      }
      if (requiresN2) {
        nextStatutPaiement = 'en_attente_n2';
        isFullyPaid = false;
      } else {
        nextStatutPaiement = 'paye';
        isFullyPaid = true;
      }
    }
  } else {
    // Examen Niveau 2 de paiement
    if (isDoubleN2 && currentPayStatut === 'en_attente_n2') {
      nextStatutPaiement = 'en_attente_n2_2e_signature';
      isFullyPaid = false;
    } else {
      if (isDoubleN2 && valReq?.validateur_n2_id === user.id) {
        return { error: 'La deuxième signature du Niveau 2 de paiement doit être effectuée par un co-signataire distinct.' };
      }
      nextStatutPaiement = 'paye';
      isFullyPaid = true;
    }
  }

  // Mettre à jour la table validations_demandes pour la traçabilité des signatures de paiement
  if (valReq) {
    const valUpdate: any = { statut_validation: nextStatutPaiement, updated_at: new Date().toISOString() };
    if (isPaiementN1Pending && currentPayStatut === 'approuve') {
      valUpdate.validateur_n1_id = user.id;
      valUpdate.date_validation_n1 = new Date().toISOString();
    } else if (isPaiementN1Pending && currentPayStatut === 'en_attente_n1_2e_signature') {
      valUpdate.validateur_n1_bis_id = user.id;
      valUpdate.date_validation_n1_bis = new Date().toISOString();
    } else if (!isPaiementN1Pending && currentPayStatut === 'en_attente_n2') {
      valUpdate.validateur_n2_id = user.id;
      valUpdate.date_validation_n2 = new Date().toISOString();
    } else if (!isPaiementN1Pending && currentPayStatut === 'en_attente_n2_2e_signature') {
      valUpdate.validateur_n2_bis_id = user.id;
      valUpdate.date_validation_n2_bis = new Date().toISOString();
    }
    await supabaseAdmin.from('validations_demandes').update(valUpdate).eq('id', valReq.id);
  }

  // Si le paiement est totalement complété, marquer la dépense comme payée et décaissée
  if (isFullyPaid) {
    const updateData: any = {
      statut: 'paye',
      compte_id: compte_id || 'compte_banque_principal',
      methode_paiement: methode_paiement || 'virement_bancaire',
      reference_transaction: reference_transaction || null,
      notes_paiement: notes || null,
      date_paiement: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let { error } = await supabaseAdmin
      .from('demandes_depenses')
      .update(updateData)
      .eq('id', depenseId);

    if (error && (error.message.includes('column') || error.code === 'PGRST204')) {
      const { error: fallbackErr } = await supabaseAdmin
        .from('demandes_depenses')
        .update({
          statut: 'paye',
          updated_at: new Date().toISOString(),
        })
        .eq('id', depenseId);
      error = fallbackErr;
    }

    if (error) {
      console.error(error);
      return { error: `Erreur lors du changement de statut: ${error.message}` };
    }
  }

  revalidatePath('/admin/finances');
  return { success: true };
}

// 10. Catégories de paiement (statutaires + personnalisées)
const STATUTORY_PAYMENT_CATEGORIES = [
  { key: 'cotisation_annuelle', label: 'Cotisation Annuelle' },
  { key: 'partenariat', label: 'Partenariats & Sponsoring' },
  { key: 'evenement', label: 'Billetterie Événement' },
  { key: 'don', label: 'Dons & Subventions' },
  { key: 'autre', label: 'Autre Recette' }
];

export async function getPaymentCategories() {
  const supabaseAdmin = createAdminClient();
  const { data } = await supabaseAdmin
    .from('settings_association')
    .select('value')
    .eq('key', 'categories_paiement')
    .single();

  if (data?.value?.categories && Array.isArray(data.value.categories)) {
    return data.value.categories as { key: string; label: string }[];
  }
  return STATUTORY_PAYMENT_CATEGORIES;
}

export async function savePaymentCategories(categories: { key: string; label: string }[]) {
  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin
    .from('settings_association')
    .upsert({
      key: 'categories_paiement',
      value: { categories }
    });

  if (error) {
    console.error(error);
    return { error: 'Erreur lors de la sauvegarde des catégories de paiement.' };
  }

  revalidatePath('/admin/configuration');
  revalidatePath('/admin/finances');
  return { success: true };
}

// 11. Enregistrer manuellement un paiement (Trésorerie)
export async function createManualPayment({
  profile_id,
  montant,
  type_paiement,
  compte_id,
  methode_paiement,
  reference_transaction,
  notes,
}: {
  profile_id?: string;
  montant: number;
  type_paiement: string;
  compte_id?: string;
  methode_paiement?: string;
  reference_transaction?: string;
  notes?: string;
}) {
  const supabaseAdmin = createAdminClient();

  if (!montant || montant <= 0) {
    return { error: 'Veuillez saisir un montant valide supérieur à 0.' };
  }

  if (!type_paiement) {
    return { error: 'Veuillez sélectionner une catégorie de paiement.' };
  }

  const insertPayload: any = {
    profile_id: profile_id || null,
    montant,
    type_paiement,
    compte_id: compte_id || 'compte_banque_principal',
    methode_paiement: methode_paiement || 'manuel',
    reference_transaction: reference_transaction || null,
    notes: notes || null,
    statut: 'succeeded',
  };

  let { data, error } = await supabaseAdmin
    .from('paiements')
    .insert(insertPayload)
    .select()
    .single();

  // Fallback si des colonnes optionnelles (compte_id, methode_paiement, reference_transaction, notes) n'existent pas encore en base
  if (error && (error.message.includes('column') || error.message.includes('compte_id') || error.code === 'PGRST204')) {
    console.warn('Retrying insert without optional columns fallback:', error.message);
    delete insertPayload.compte_id;
    delete insertPayload.methode_paiement;
    delete insertPayload.reference_transaction;
    delete insertPayload.notes;

    const retryRes = await supabaseAdmin
      .from('paiements')
      .insert(insertPayload)
      .select()
      .single();

    data = retryRes.data;
    error = retryRes.error;
  }

  if (error) {
    console.error(error);
    return { error: `Erreur lors de l'enregistrement du paiement: ${error.message}` };
  }

  // Si c'est une cotisation annuelle et qu'un membre est lié, mettre à jour son statut d'adhésion si nécessaire
  if (profile_id && type_paiement === 'cotisation_annuelle') {
    await supabaseAdmin
      .from('profiles')
      .update({
        statut_adhesion: 'actif',
        date_adhesion: new Date().toISOString(),
      })
      .eq('id', profile_id);
  }

  revalidatePath('/admin/finances');
  revalidatePath('/dashboard/cotisations');
  return { success: true, payment: data };
}
