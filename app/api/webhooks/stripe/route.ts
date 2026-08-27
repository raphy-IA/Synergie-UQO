import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import Stripe from 'stripe';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return new NextResponse('Webhook error: Missing stripe signature', { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error(`Error verifying webhook signature: ${err.message}`);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const supabase = createAdminClient();

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    const profileId = session.metadata?.profileId;
    if (!profileId) {
      return new NextResponse('Webhook Error: Missing profileId metadata', { status: 400 });
    }

    // 1. Enregistrer le paiement dans la DB
    const { error: paiementError } = await supabase
      .from('paiements')
      .insert({
        profile_id: profileId,
        stripe_session_id: session.id,
        stripe_payment_intent: session.payment_intent as string,
        montant: session.amount_total ? session.amount_total / 100 : 0,
        devise: session.currency?.toUpperCase() || 'CAD',
        statut: 'paid',
        type_paiement: 'cotisation_annuelle',
      });

    if (paiementError) {
      console.error('Error inserting paiement:', paiementError);
      return new NextResponse('Database Error inserting paiement', { status: 500 });
    }

    // 2. Mettre à jour le statut d'adhésion du membre à "en_attente_approbation"
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        statut_adhesion: 'en_attente_approbation',
        updated_at: new Date().toISOString(),
      })
      .eq('id', profileId);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      return new NextResponse('Database Error updating profile', { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
