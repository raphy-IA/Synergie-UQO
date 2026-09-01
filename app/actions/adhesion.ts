'use server';

import { AdhesionSchema } from '@/lib/validations/adhesion';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe';
import { sendMail } from '@/lib/email';
import { headers } from 'next/headers';

export async function submitAdhesion(formData: any) {
  const result = AdhesionSchema.safeParse(formData);

  if (!result.success) {
    return { error: result.error.flatten().fieldErrors };
  }

  const {
    email,
    password,
    prenom,
    nom,
    telephone,
    categorie,
    programme_etudes,
    matricule_uqo,
    consentement_loi_25,
    niveau_etudes,
    domaine_etudes,
    annee_diplome,
    poste_actuel,
    employeur,
    secteur_activite,
  } = result.data;

  const supabaseServer = createServerClient();
  const supabaseAdmin = createAdminClient();

  // 1. Inscrire l'utilisateur dans Supabase Auth
  const { data: authData, error: authError } = await supabaseServer.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${headers().get('origin') || 'http://localhost:3000'}/login`,
      data: {
        prenom,
        nom,
      }
    }
  });

  if (authError) {
    return { error: authError.message };
  }

  const user = authData.user;
  if (!user) {
    return { error: "Erreur lors de la création du compte." };
  }

  // 2. Créer le profil dans la table profiles avec le statut 'en_attente_approbation'
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .insert({
      id: user.id,
      email,
      prenom,
      nom,
      telephone: telephone || null,
      categorie,
      programme_etudes: programme_etudes || null,
      matricule_uqo: matricule_uqo || null,
      niveau_etudes: niveau_etudes || null,
      domaine_etudes: domaine_etudes || null,
      annee_diplome: annee_diplome || null,
      poste_actuel: poste_actuel || null,
      employeur: employeur || null,
      secteur_activite: secteur_activite || null,
      consentement_loi_25,
      statut_adhesion: 'en_attente_approbation',
      role: 'membre', // Rôle par défaut
    });

  if (profileError) {
    console.error('Profile creation error:', profileError);
    return { error: "Erreur lors de la création du profil utilisateur." };
  }

  // 3. Envoyer le courriel de réception de candidature (en tâche de fond pour ne pas bloquer l'inscription)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  sendMail({
    to: email,
    subject: "Confirmation de votre demande d'adhésion - Synergie UQO",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #1e3a8a;">Demande d'adhésion reçue</h2>
        <p>Bonjour <strong>${prenom} ${nom}</strong>,</p>
        <p>Nous vous remercions pour votre intérêt envers Synergie UQO. Votre demande d'adhésion en tant que membre de catégorie <strong style="text-transform: capitalize;">${categorie}</strong> a bien été enregistrée.</p>
        <p>Votre dossier est en cours d'examen par le Conseil d'Administration de l'association. Cette vérification prend généralement entre 24 et 48 heures.</p>
        <p>Une fois votre candidature validée, vous recevrez un courriel de confirmation vous invitant à vous connecter pour activer pleinement votre espace membre.</p>
        <div style="margin: 30px 0; text-align: center;">
          <a href="${appUrl}/login" style="background-color: #1e3a8a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Accéder à mon espace membre</a>
        </div>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <h3 style="color: #1e3a8a; font-size: 14px; margin: 0 0 10px 0;">Vos acc&egrave;s &agrave; l&apos;espace membre</h3>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Adresse courriel :</strong> ${email}</p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Mot de passe :</strong> celui que vous avez d&eacute;fini lors de votre demande d&apos;adh&eacute;sion.</p>
          <p style="margin: 10px 0 4px 0; font-size: 14px;">Acc&eacute;dez &agrave; votre espace membre : <a href="${appUrl}/login" style="color: #1e3a8a; font-weight: bold;">${appUrl}/login</a></p>
        </div>
        <p>Cordialement,</p>
        <p>Le Conseil d'Administration de <strong>Synergie UQO</strong></p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-top: 40px;" />
        <p style="font-size: 11px; color: #64748b; text-align: center;">Cet email a été envoyé automatiquement. Veuillez ne pas y répondre directement.</p>
      </div>
    `,
  }).catch((emailErr) => {
    console.error('Error sending registration confirmation email:', emailErr);
  });

  return { success: true, redirectUrl: '/adhesion/succes' };
}

export async function createAdhesionPaymentSession() {
  const supabaseServer = createServerClient();
  const { data: { user } } = await supabaseServer.auth.getUser();

  if (!user) {
    return { error: "Vous devez être connecté." };
  }

  const { data: profile, error: profileError } = await supabaseServer
    .from('profiles')
    .select('id, email, categorie, statut_adhesion')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return { error: "Profil introuvable." };
  }

  if (profile.statut_adhesion !== 'en_attente_paiement') {
    return { error: "Votre statut actuel ne permet pas de régler la cotisation." };
  }

  const origin = headers().get('origin') || 'http://localhost:3000';
  const priceAmount = profile.categorie === 'associe' ? 5000 : 3000; // 50$ pour associé, 30$ pour les autres

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'cad',
            product_data: {
              name: `Cotisation Annuelle Synergie UQO - ${profile.categorie.toUpperCase()}`,
              description: `Activation de votre carte de membre Synergie UQO`,
            },
            unit_amount: priceAmount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/dashboard?payment=success`,
      cancel_url: `${origin}/dashboard?payment=canceled`,
      metadata: {
        profileId: profile.id,
        email: profile.email,
      },
      customer_email: profile.email,
    });

    return { success: true, redirectUrl: session.url };
  } catch (stripeError: any) {
    console.error('Stripe session error:', stripeError);
    return { error: "Erreur lors de l'initialisation du paiement Stripe." };
  }
}

export interface AdhesionGraceSettings {
  delai_grace_adhesion_jours: number;
  delai_grace_renouvellement_jours: number;
  duree_validite_cotisation_jours: number;
}

export async function getAdhesionGraceSettings(): Promise<AdhesionGraceSettings> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('settings_association')
    .select('value')
    .eq('key', 'delais_adhesion')
    .single();

  return {
    delai_grace_adhesion_jours: data?.value?.delai_grace_adhesion_jours ?? 14,
    delai_grace_renouvellement_jours: data?.value?.delai_grace_renouvellement_jours ?? 14,
    duree_validite_cotisation_jours: data?.value?.duree_validite_cotisation_jours ?? 365,
  };
}

export async function updateAdhesionGraceSettings(payload: Partial<AdhesionGraceSettings>) {
  const supabase = createAdminClient();
  const current = await getAdhesionGraceSettings();
  const updated = {
    ...current,
    ...payload,
  };

  const { error } = await supabase
    .from('settings_association')
    .upsert({
      key: 'delais_adhesion',
      value: updated,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    return { error: "Erreur lors de la mise à jour des délais d'adhésion." };
  }

  const { revalidatePath } = await import('next/cache');
  revalidatePath('/admin/configuration');
  revalidatePath('/dashboard');
  return { success: true, settings: updated };
}
