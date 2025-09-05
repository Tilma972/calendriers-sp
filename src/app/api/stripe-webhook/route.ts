// src/app/api/stripe-webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/shared/lib/supabase';

// Configuration Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();
  const sig = headersList.get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Webhook Error: Invalid signature' }, { status: 400 });
  }

  console.log('📩 Stripe webhook received:', event.type, event.id);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'checkout.session.expired':
        await handleCheckoutSessionExpired(event.data.object as Stripe.Checkout.Session);
        break;

      default:
        console.log(`🔍 Unhandled event type: ${event.type}`);
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed', details: error.message },
      { status: 500 }
    );
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('💳 Checkout session completed:', session.id);

  if (!supabaseAdmin) {
    console.error('❌ Supabase Admin client not available');
    return;
  }

  try {
    // Extraire l'interaction_id depuis les metadata ou client_reference_id
    const interactionId = session.client_reference_id || session.metadata?.interaction_id;
    
    if (!interactionId) {
      console.error('❌ No interaction_id found in session metadata or client_reference_id');
      return;
    }

    console.log('🔍 Processing interaction:', interactionId);

    // Récupérer les informations du donateur depuis Stripe
    const customerDetails = session.customer_details;
    const donatorName = customerDetails?.name || 'Donateur anonyme';
    const donatorEmail = customerDetails?.email || '';

    console.log('👤 Donator info:', { name: donatorName, email: donatorEmail });

    // Appeler la fonction Supabase pour finaliser l'interaction QR
    const { data, error } = await supabaseAdmin
      .rpc('complete_qr_interaction', {
        interaction_id_param: interactionId,
        stripe_session_id_param: session.id,
        donator_name_param: donatorName,
        donator_email_param: donatorEmail
      });

    if (error) {
      console.error('❌ Error completing QR interaction:', error);
      return;
    }

    if (!data || data.length === 0 || !data[0].success) {
      console.error('❌ QR interaction completion failed or interaction not found');
      return;
    }

    const result = data[0];
    console.log('✅ QR interaction completed successfully:', {
      transactionId: result.transaction_id,
      teamId: result.team_id,
      teamName: result.team_name
    });

    // Envoyer une notification Realtime pour informer les sapeurs
    await sendRealtimeNotification({
      type: 'qr_payment_completed',
      teamId: result.team_id,
      teamName: result.team_name,
      transactionId: result.transaction_id,
      donatorName,
      donatorEmail,
      amount: session.amount_total ? session.amount_total / 100 : 10, // Convertir centimes en euros
      interactionId
    });

    // Optionnel: Envoyer un email de reçu au donateur
    if (donatorEmail && result.transaction_id) {
      await sendReceiptEmail(result.transaction_id, donatorEmail, donatorName);
    }

  } catch (error: any) {
    console.error('❌ Error in handleCheckoutSessionCompleted:', error);
  }
}

async function handleCheckoutSessionExpired(session: Stripe.Checkout.Session) {
  console.log('⏰ Checkout session expired:', session.id);

  if (!supabaseAdmin) {
    console.error('❌ Supabase Admin client not available');
    return;
  }

  const interactionId = session.client_reference_id || session.metadata?.interaction_id;
  
  if (!interactionId) {
    console.log('🔍 No interaction_id found for expired session');
    return;
  }

  try {
    // Marquer l'interaction QR comme expirée
    const { error } = await supabaseAdmin
      .from('qr_interactions')
      .update({
        status: 'expired',
        updated_at: new Date().toISOString()
      })
      .eq('interaction_id', interactionId)
      .eq('status', 'pending');

    if (error) {
      console.error('❌ Error marking QR interaction as expired:', error);
    } else {
      console.log('✅ QR interaction marked as expired:', interactionId);
    }
  } catch (error: any) {
    console.error('❌ Error in handleCheckoutSessionExpired:', error);
  }
}

async function sendRealtimeNotification(payload: {
  type: string;
  teamId: string;
  teamName: string;
  transactionId: string;
  donatorName: string;
  donatorEmail: string;
  amount: number;
  interactionId: string;
}) {
  if (!supabaseAdmin) return;

  try {
    // Envoyer sur le channel général pour tous les utilisateurs
    const channel = supabaseAdmin.channel('qr-payments');
    
    await channel.send({
      type: 'broadcast',
      event: 'qr_payment_completed',
      payload
    });

    console.log('📡 Realtime notification sent:', payload.type);
  } catch (error: any) {
    console.error('❌ Error sending realtime notification:', error);
  }
}

async function sendReceiptEmail(transactionId: string, donatorEmail: string, donatorName: string) {
  try {
    console.log('📧 Sending receipt email to:', donatorEmail);
    
    // Appeler l'API d'envoi de reçu existante
    const receiptResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/donations/send-receipt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transactionId,
        donatorInfo: {
          email: donatorEmail,
          name: donatorName
        },
        sapeurInfo: {
          name: 'Paiement QR automatique'
        },
        options: {
          sendEmail: true
        }
      })
    });

    if (receiptResponse.ok) {
      const result = await receiptResponse.json();
      console.log('✅ Receipt email sent successfully:', result.receiptNumber);
    } else {
      console.error('❌ Failed to send receipt email:', receiptResponse.statusText);
    }
  } catch (error: any) {
    console.error('❌ Error sending receipt email:', error);
  }
}