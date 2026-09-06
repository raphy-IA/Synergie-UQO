'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { sendMail } from '@/lib/email';

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

  // Notification interne et email discret au membre ajouté
  const { data: comm } = await supabaseAdmin
    .from('commissions')
    .select('nom')
    .eq('id', commissionId)
    .single();

  const { data: memberProf } = await supabaseAdmin
    .from('profiles')
    .select('id, email, prenom, nom')
    .eq('id', profileId)
    .single();

  if (comm && memberProf) {
    await supabaseAdmin.from('notifications').insert({
      profile_id: memberProf.id,
      titre: `Nomination dans la commission ${comm.nom}`,
      contenu: `Vous avez été ajouté(e) à la commission "${comm.nom}". Cliquez pour accéder à votre espace de travail.`,
      link_url: `/dashboard/commissions/${commissionId}`,
    });

    if (memberProf.email) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://synergie-uqo.ca';
      const loginUrl = `${appUrl}/login`;

      try {
        await sendMail({
          to: memberProf.email,
          subject: `Nomination dans une commission Synergie UQO 🏛️`,
          html: `
            <div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #1e3a8a; font-size: 18px;">Nomination au sein d'une commission</h2>
              <p>Bonjour <strong>${memberProf.prenom || ''} ${memberProf.nom || ''}</strong>,</p>
              <p>Vous avez été officiellement nommé(e) au sein de la commission <strong>"${comm.nom}"</strong> de la plateforme <strong>Synergie UQO</strong>.</p>
              <p style="background-color: #f8fafc; padding: 12px; border-left: 4px solid #1e3a8a; border-radius: 4px; font-style: italic; color: #475569;">
                Connectez-vous à votre espace membre pour découvrir vos missions, objectifs et collaborer avec les autres membres.
              </p>
              <div style="margin: 24px 0; text-align: center;">
                <a href="${loginUrl}" style="background-color: #1e3a8a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Accéder à mon espace membre</a>
              </div>
              <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-top: 24px;" />
              <p style="font-size: 11px; color: #94a3b8; text-align: center;">Synergie UQO - Message automatique système</p>
            </div>
          `,
        });
      } catch (mailErr) {
        console.error(`Erreur email nomination commission à ${memberProf.email}:`, mailErr);
      }
    }
  }

  revalidatePath('/admin/commissions');
  revalidatePath(`/dashboard/commissions/${commissionId}`);
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
