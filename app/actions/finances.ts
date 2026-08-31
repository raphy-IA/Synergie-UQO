'use server';

import { createClient } from '@/lib/supabase/server';
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
}

export interface SolidarityPayload {
  montant_demande: number;
  motif: string;
  justificatif_url?: string;
}

// 1. Récupérer le Bilan Financier Global (KPIs & Bilan)
export async function getFinancialSummary() {
  const supabase = createClient();

  // A. Fond de caisse initial
  const { data: fondSetting } = await supabase
    .from('settings_association')
    .select('value')
    .eq('key', 'fond_caisse_initial')
    .single();

  const fondInitial = fondSetting?.value?.montant || 0.0;

  // B. Totaux des revenus (Cotisations + Billetterie + Subventions + Partenariats)
  const { data: paiements } = await supabase
    .from('paiements')
    .select('montant, type_paiement, created_at')
    .eq('statut', 'succeeded');

  const totalRevenus = (paiements || []).reduce((sum, p) => sum + Number(p.montant), 0);

  // C. Totaux des dépenses approuvées/payées
  const { data: depenses } = await supabase
    .from('demandes_depenses')
    .select('montant, categorie, statut')
    .in('statut', ['approuve', 'paye']);

  const totalDepenses = (depenses || []).reduce((sum, d) => sum + Number(d.montant), 0);

  // D. Totaux des aides de solidarité versées
  const { data: aides } = await supabase
    .from('fonds_solidarite_demandes')
    .select('montant_demande, statut')
    .in('statut', ['approuve', 'verse']);

  const totalAides = (aides || []).reduce((sum, a) => sum + Number(a.montant_demande), 0);

  // E. Solde de trésorerie net
  const soldeTresorerie = fondInitial + totalRevenus - totalDepenses - totalAides;

  return {
    fondInitial,
    totalRevenus,
    totalDepenses,
    totalAides,
    soldeTresorerie,
    nombrePaiements: (paiements || []).length,
    nombreDepenses: (depenses || []).length,
    nombreAides: (aides || []).length,
  };
}

// 2. Grand Livre Comptable Unifié (Ledger de tous les crédits et débits)
export async function getAccountingLedger() {
  const supabase = createClient();

  // 1. Crédits (Revenus)
  const { data: paiements } = await supabase
    .from('paiements')
    .select(`
      id,
      montant,
      type_paiement,
      statut,
      created_at,
      profiles (prenom, nom)
    `)
    .order('created_at', { ascending: false });

  // 2. Débits (Notes de frais / Dépenses)
  const { data: depenses } = await supabase
    .from('demandes_depenses')
    .select(`
      id,
      titre,
      montant,
      categorie,
      statut,
      created_at,
      profiles:demandeur_id (prenom, nom)
    `)
    .order('created_at', { ascending: false });

  // 3. Débits (Aides de solidarité)
  const { data: aides } = await supabase
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
      libelle: `Paiement / ${p.type_paiement}`,
      montant: Number(p.montant),
      tiers: prof ? `${prof.prenom} ${prof.nom}` : 'Client/Membre',
      statut: p.statut,
      date: p.created_at,
    });
  });

  (depenses || []).forEach(d => {
    const prof: any = Array.isArray(d.profiles) ? d.profiles[0] : d.profiles;
    ledger.push({
      id: `d-${d.id}`,
      type: 'debit',
      categorie: d.categorie || 'depense',
      libelle: `Dépense : ${d.titre}`,
      montant: Number(d.montant),
      tiers: prof ? `${prof.prenom} ${prof.nom}` : 'Membre',
      statut: d.statut,
      date: d.created_at,
    });
  });

  (aides || []).forEach(a => {
    const prof: any = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles;
    ledger.push({
      id: `a-${a.id}`,
      type: 'debit',
      categorie: 'aide_solidarite',
      libelle: `Aide d'urgence : ${a.motif ? a.motif.substring(0, 30) : 'Secours'}`,
      montant: Number(a.montant_demande),
      tiers: prof ? `${prof.prenom} ${prof.nom}` : 'Membre',
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

  const { data: depense, error } = await supabase
    .from('demandes_depenses')
    .insert({
      titre: payload.titre,
      description: payload.description || null,
      montant: payload.montant,
      categorie: payload.categorie || 'autre',
      justificatif_url: payload.justificatif_url || null,
      demandeur_id: user.id,
      evenement_id: payload.evenement_id || null,
      commission_id: payload.commission_id || null,
      statut: 'en_attente_n1',
    })
    .select()
    .single();

  if (error || !depense) {
    console.error('Error creating expense claim:', error);
    return { error: 'Erreur lors de la création de la demande de dépense.' };
  }

  await submitForValidation({
    typeEntite: 'depense',
    entiteId: depense.id,
    montantDepense: payload.montant,
  });

  revalidatePath('/dashboard/cotisations');
  revalidatePath('/admin/finances');
  return { success: true, depense };
}

// 8. Récupérer les dépenses (Membres ou Admins)
export async function getExpenseClaims() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('demandes_depenses')
    .select(`
      *,
      profiles:demandeur_id (prenom, nom, email),
      evenements:evenement_id (titre),
      commissions:commission_id (nom)
    `)
    .order('created_at', { ascending: false });

  if (error) console.error(error);
  return data || [];
}

// 9. Marquer une dépense comme payée / remboursée par le Trésorier
export async function markExpenseAsPaid(depenseId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from('demandes_depenses')
    .update({
      statut: 'paye',
      updated_at: new Date().toISOString(),
    })
    .eq('id', depenseId);

  if (error) {
    return { error: 'Erreur lors du changement de statut.' };
  }

  revalidatePath('/admin/finances');
  return { success: true };
}
