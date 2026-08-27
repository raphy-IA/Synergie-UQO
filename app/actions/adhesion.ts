'use server';

import { AdhesionSchema } from '@/lib/validations/adhesion';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe';
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

  // 2. Créer le profil dans la table profiles
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
      consentement_loi_25,
      statut_adhesion: 'en_attente_paiement',
      role: 'membre', // Rôle par défaut
    });

  if (profileError) {
    console.error('Profile creation error:', profileError);
    // Tenter de nettoyer l'auth user si possible ou informer le client
    return { error: "Erreur lors de la création du profil utilisateur." };
  }

  // 3. Si membre d'honneur (exempté de cotisation)
  if (categorie === 'honneur') {
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ statut_adhesion: 'en_attente_approbation' })
      .eq('id', user.id);

    if (updateError) {
      return { error: "Erreur de mise à jour du profil." };
    }

    return { success: true, redirectUrl: '/adhesion/succes?exempt=true' };
  }

  // 4. Initialiser la session Stripe Checkout
  const origin = headers().get('origin') || 'http://localhost:3000';
  const priceAmount = categorie === 'associe' ? 5000 : 3000; // 50$ pour associé, 30$ pour étudiant/diplômé/ancien

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'cad',
            product_data: {
              name: `Cotisation Annuelle Synergie UQO - ${categorie.toUpperCase()}`,
              description: `Adhésion annuelle pour l'association Synergie UQO`,
            },
            unit_amount: priceAmount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/adhesion/succes?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/adhesion?canceled=true`,
      metadata: {
        profileId: user.id,
        email,
      },
      customer_email: email,
    });

    return { success: true, redirectUrl: session.url };
  } catch (stripeError: any) {
    console.error('Stripe session error:', stripeError);
    return { error: "Erreur lors de l'initialisation du paiement Stripe." };
  }
}
