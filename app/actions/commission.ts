'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

async function verifyAdmin() {
  const supabaseServer = createServerClient();
  const { data: { user } } = await supabaseServer.auth.getUser();
  if (!user) return { error: "Non authentifié." };

  const { data: profile } = await supabaseServer
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin_ca', 'superadmin'].includes(profile.role)) {
    return { error: "Droits insuffisants." };
  }

  return { success: true };
}

export async function createCommission(data: { nom: string; description?: string; objectifs?: string; date_fin?: string; responsable_id?: string }) {
  const auth = await verifyAdmin();
  if (auth.error) return auth;

  const supabaseAdmin = createAdminClient();
  const { data: commission, error } = await supabaseAdmin
    .from('commissions')
    .insert({
      nom: data.nom,
      description: data.description || null,
      objectifs: data.objectifs || null,
      date_fin: data.date_fin || null,
      responsable_id: data.responsable_id || null,
    })
    .select('id')
    .single();

  if (error || !commission) {
    console.error('Error creating commission:', error);
    return { error: "Erreur lors de la création de la commission." };
  }

  revalidatePath('/admin/commissions');
  return { success: true, id: commission.id };
}

export async function updateCommission(id: string, data: { nom: string; description?: string; objectifs?: string; date_fin?: string; responsable_id?: string }) {
  const auth = await verifyAdmin();
  if (auth.error) return auth;

  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin
    .from('commissions')
    .update({
      nom: data.nom,
      description: data.description || null,
      objectifs: data.objectifs || null,
      date_fin: data.date_fin || null,
      responsable_id: data.responsable_id || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('Error updating commission:', error);
    return { error: "Erreur lors de la mise à jour de la commission." };
  }

  revalidatePath('/admin/commissions');
  return { success: true };
}

export async function deleteCommission(id: string) {
  const auth = await verifyAdmin();
  if (auth.error) return auth;

  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin
    .from('commissions')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting commission:', error);
    return { error: "Erreur lors de la suppression de la commission." };
  }

  revalidatePath('/admin/commissions');
  return { success: true };
}

export async function addCommissionMember(commissionId: string, profileId: string, roleCommission?: string) {
  const auth = await verifyAdmin();
  if (auth.error) return auth;

  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin
    .from('commission_membres')
    .insert({
      commission_id: commissionId,
      profile_id: profileId,
      role_commission: roleCommission || 'membre',
    });

  if (error) {
    console.error('Error adding commission member:', error);
    return { error: "Erreur lors de l'ajout du membre à la commission." };
  }

  revalidatePath('/admin/commissions');
  return { success: true };
}

export async function removeCommissionMember(commissionId: string, profileId: string) {
  const auth = await verifyAdmin();
  if (auth.error) return auth;

  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin
    .from('commission_membres')
    .delete()
    .eq('commission_id', commissionId)
    .eq('profile_id', profileId);

  if (error) {
    console.error('Error removing commission member:', error);
    return { error: "Erreur lors du retrait du membre de la commission." };
  }

  revalidatePath('/admin/commissions');
  return { success: true };
}
