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

  if (!profile || !['admin_ca', 'superadmin', 'president', 'vice_president', 'secretaire'].includes(profile.role)) {
    return { error: "Droits insuffisants." };
  }

  return { success: true };
}

export async function createCommission(data: {
  nom: string;
  description?: string;
  objectifs?: string;
  date_fin?: string;
  responsable_id?: string;
  missions?: { titre: string; description?: string }[];
}) {
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
      responsable_id: data.responsable_id && data.responsable_id !== 'none' ? data.responsable_id : null,
    })
    .select('id')
    .single();

  if (error || !commission) {
    console.error('Error creating commission:', error);
    return { error: "Erreur lors de la création de la commission." };
  }

  // Insert initial missions if provided
  if (data.missions && data.missions.length > 0) {
    const records = data.missions.map((m, idx) => ({
      commission_id: commission.id,
      numero_mission: idx + 1,
      titre: m.titre,
      description: m.description || null,
      actif: true,
    }));
    await supabaseAdmin.from('commission_missions').insert(records);
  }

  revalidatePath('/admin/commissions');
  revalidatePath('/dashboard/commissions');
  return { success: true, id: commission.id };
}

export async function updateCommission(id: string, data: {
  nom: string;
  description?: string;
  objectifs?: string;
  date_fin?: string;
  responsable_id?: string;
  missions?: { id?: string; numero_mission?: number; titre: string; description?: string }[];
}) {
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
      responsable_id: data.responsable_id && data.responsable_id !== 'none' ? data.responsable_id : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('Error updating commission:', error);
    return { error: "Erreur lors de la mise à jour de la commission." };
  }

  // Save/Update missions if provided
  if (data.missions && data.missions.length > 0) {
    for (let idx = 0; idx < data.missions.length; idx++) {
      const m = data.missions[idx];
      if (m.id) {
        await supabaseAdmin
          .from('commission_missions')
          .update({
            titre: m.titre,
            description: m.description || null,
            numero_mission: m.numero_mission || idx + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', m.id);
      } else {
        await supabaseAdmin
          .from('commission_missions')
          .insert({
            commission_id: id,
            numero_mission: idx + 1,
            titre: m.titre,
            description: m.description || null,
            actif: true
          });
      }
    }
  }

  revalidatePath('/admin/commissions');
  revalidatePath(`/dashboard/commissions/${id}`);
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
