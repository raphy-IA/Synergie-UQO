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
      consentement_loi_25,
      statut_adhesion: 'en_attente_approbation',
      role: 'membre', // Rôle par défaut
    });

  if (profileError) {
    console.error('Profile creation error:', profileError);
    return { error: "Erreur lors de la création du profil utilisateur." };
  }

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
