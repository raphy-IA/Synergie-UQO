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

// 1. Soumettre une demande de remboursement / dépense
export async function submitExpenseClaim(payload: DepensePayload) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Non authentifié' };

  if (!payload.titre || !payload.montant || payload.montant <= 0) {
    return { error: 'Veuillez renseigner un titre et un montant valide.' };
  }

  // 1. Créer la dépense
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

  // 2. Soumettre au flux de validation automatisé
  await submitForValidation({
    typeEntite: 'depense',
    entiteId: depense.id,
    montantDepense: payload.montant,
  });

  revalidatePath('/dashboard/cotisations');
  revalidatePath('/admin/finances');
  return { success: true, depense };
}

// 2. Récupérer les dépenses (Membres ou Admins)
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

// 3. Marquer une dépense comme payée / remboursée par le Trésorier
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
