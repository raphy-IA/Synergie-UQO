'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { resend } from '@/lib/resend';
import { revalidatePath } from 'next/cache';

// Actions d'approbation et de rejet de membre
export async function approveMember(memberId: string) {
  const supabaseServer = createServerClient();
  
  // Vérification de rôle de l'utilisateur effectuant l'action
  const { data: { user } } = await supabaseServer.auth.getUser();
  if (!user) return { error: "Non authentifié." };

  const { data: callerProfile } = await supabaseServer
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!callerProfile || !['admin_ca', 'superadmin'].includes(callerProfile.role)) {
    return { error: "Droits insuffisants." };
  }

  const supabaseAdmin = createAdminClient();

  // 1. Mettre à jour le profil de l'utilisateur
  const { data: profile, error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({
      statut_adhesion: 'approuve',
      date_expiration_adhesion: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // +1 an
      updated_at: new Date().toISOString(),
    })
    .eq('id', memberId)
    .select()
    .single();

  if (updateError || !profile) {
    console.error('Error approving member:', updateError);
    return { error: "Erreur de base de données." };
  }

  // 2. Envoyer le courriel de bienvenue avec Resend
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Synergie UQO <noreply@synergie-uqo.ca>',
      to: profile.email,
      subject: 'Bienvenue chez Synergie UQO ! Votre adhésion est approuvée 🎉',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #1e3a8a;">Bienvenue chez Synergie UQO !</h2>
          <p>Bonjour <strong>${profile.prenom} ${profile.nom}</strong>,</p>
          <p>Nous avons le plaisir de vous informer que votre demande d'adhésion en tant que membre de catégorie <strong style="text-transform: capitalize;">${profile.categorie}</strong> a été officiellement approuvée par le Conseil d'Administration.</p>
          <p>Vous pouvez maintenant vous connecter à votre Espace Membre sécurisé pour consulter votre profil, afficher votre carte de membre virtuelle QR Code et accéder à nos opportunités exclusives.</p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="${appUrl}/login" style="background-color: #1e3a8a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Accéder à mon Espace Membre</a>
          </div>
          <p>À très bientôt,</p>
          <p>Le Conseil d'Administration de <strong>Synergie UQO</strong></p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-top: 40px;" />
          <p style="font-size: 11px; color: #64748b; text-align: center;">Cet email a été envoyé automatiquement. Veuillez ne pas y répondre directement.</p>
        </div>
      `,
    });
  } catch (emailErr) {
    console.error('Resend error:', emailErr);
    // On ne bloque pas la validation si le courriel échoue
  }

  revalidatePath('/admin/adhesions');
  revalidatePath('/admin/membres');
  return { success: true };
}

export async function rejectMember(memberId: string, motif: string) {
  const supabaseServer = createServerClient();
  
  const { data: { user } } = await supabaseServer.auth.getUser();
  if (!user) return { error: "Non authentifié." };

  const { data: callerProfile } = await supabaseServer
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!callerProfile || !['admin_ca', 'superadmin'].includes(callerProfile.role)) {
    return { error: "Droits insuffisants." };
  }

  const supabaseAdmin = createAdminClient();

  // 1. Mettre à jour le profil de l'utilisateur
  const { data: profile, error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({
      statut_adhesion: 'rejete',
      updated_at: new Date().toISOString(),
    })
    .eq('id', memberId)
    .select()
    .single();

  if (updateError || !profile) {
    console.error('Error rejecting member:', updateError);
    return { error: "Erreur de base de données." };
  }

  // 2. Envoyer le courriel de rejet avec le motif
  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Synergie UQO <noreply@synergie-uqo.ca>',
      to: profile.email,
      subject: "Mise à jour concernant votre demande d'adhésion - Synergie UQO",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #b91c1c;">Votre demande d'adhésion à Synergie UQO</h2>
          <p>Bonjour <strong>${profile.prenom} ${profile.nom}</strong>,</p>
          <p>Nous avons révisé votre demande d'adhésion à Synergie UQO.</p>
          <p>Malheureusement, le Conseil d'Administration n'a pas pu valider votre demande pour le motif suivant :</p>
          <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; color: #991b1b; font-style: italic;">
            "${motif}"
          </div>
          <p>Si vous pensez qu'il s'agit d'une erreur ou si vous souhaitez soumettre à nouveau vos justificatifs, vous pouvez nous recontacter.</p>
          <p>Cordialement,</p>
          <p>Le Conseil d'Administration de <strong>Synergie UQO</strong></p>
        </div>
      `,
    });
  } catch (emailErr) {
    console.error('Resend error:', emailErr);
  }

  revalidatePath('/admin/adhesions');
  revalidatePath('/admin/membres');
  return { success: true };
}

// CMS Articles CRUD Actions
export async function saveArticle(article: {
  id?: string;
  slug: string;
  titre: string;
  resume: string;
  contenu: string;
  categorie: 'education' | 'carriere' | 'entrepreneuriat' | 'politiques_lois' | 'vie_associative';
  image_couverture?: string;
  est_publie: boolean;
}) {
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

  const payload: any = {
    slug: article.slug,
    titre: article.titre,
    resume: article.resume,
    contenu: article.contenu,
    categorie: article.categorie,
    image_couverture: article.image_couverture || null,
    est_publie: article.est_publie,
    auteur_id: user.id,
    updated_at: new Date().toISOString(),
  };

  if (article.est_publie) {
    payload.date_publication = new Date().toISOString();
  }

  if (article.id) {
    // Modification
    const { error } = await supabaseServer
      .from('articles')
      .update(payload)
      .eq('id', article.id);

    if (error) {
      console.error(error);
      return { error: "Erreur lors de la modification de l'article." };
    }
  } else {
    // Création
    payload.created_at = new Date().toISOString();
    const { error } = await supabaseServer
      .from('articles')
      .insert(payload);

    if (error) {
      console.error(error);
      return { error: "Erreur lors de la création de l'article." };
    }
  }

  revalidatePath('/blog');
  revalidatePath(`/blog/${article.slug}`);
  revalidatePath('/admin/articles');
  return { success: true };
}

export async function deleteArticle(articleId: string) {
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

  const { error } = await supabaseServer
    .from('articles')
    .delete()
    .eq('id', articleId);

  if (error) {
    return { error: "Erreur lors de la suppression de l'article." };
  }

  revalidatePath('/blog');
  revalidatePath('/admin/articles');
  return { success: true };
}
