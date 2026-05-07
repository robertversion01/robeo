import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-04-22.dahlia',
});

// This is your Stripe webhook secret for testing your endpoint locally
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const sig = req.headers.get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    // Verify the event came from Stripe
    if (endpointSecret) {
      event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
    } else {
      // For development without signature verification
      event = JSON.parse(payload) as Stripe.Event;
    }
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error(`Error processing webhook: ${error.message}`);
    return NextResponse.json({ error: `Error processing webhook: ${error.message}` }, { status: 500 });
  }
}

/**
 * Handle successful payment intent
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment Intent Succeeded:', paymentIntent.id);

  // Find the transaction associated with this payment intent
  const { data: transaction, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('payment_intent_id', paymentIntent.id)
    .single();

  if (error || !transaction) {
    console.error('Transaction not found for payment intent:', paymentIntent.id);
    return;
  }

  // Update transaction status to 'paid'
  await supabase
    .from('transactions')
    .update({ status: 'paid' })
    .eq('id', transaction.id);

  // Update product status to 'sold'
  await supabase
    .from('products')
    .update({ status: 'sold' })
    .eq('id', transaction.product_id);

  // Send notification to seller
  await supabase
    .from('messages')
    .insert({
      sender_id: transaction.buyer_id,
      receiver_id: transaction.seller_id,
      content: `🎉 Sikeres vásárlás! A termék kifizetése megtörtént. A pénz letétben van, amíg a termék meg nem érkezik.`,
      product_id: transaction.product_id,
      is_system_message: true
    });
}

/**
 * Handle failed payment intent
 */
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment Intent Failed:', paymentIntent.id);

  // Find the transaction associated with this payment intent
  const { data: transaction, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('payment_intent_id', paymentIntent.id)
    .single();

  if (error || !transaction) {
    console.error('Transaction not found for payment intent:', paymentIntent.id);
    return;
  }

  // Update transaction status to 'payment_failed'
  await supabase
    .from('transactions')
    .update({ status: 'payment_failed' })
    .eq('id', transaction.id);
}

/**
 * Handle completed checkout session
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('Checkout Session Completed:', session.id);

  // Extract metadata from the session
  const { productId, buyerId, sellerId, transactionId } = session.metadata || {};

  if (!productId || !buyerId || !sellerId) {
    console.error('Missing metadata in checkout session:', session.id);
    return;
  }

  // If we have a transaction ID, update it
  if (transactionId) {
    await supabase
      .from('transactions')
      .update({ 
        status: 'paid',
        payment_intent_id: session.payment_intent as string
      })
      .eq('id', transactionId);
  } else {
    // Otherwise create a new transaction record
    await supabase
      .from('transactions')
      .insert({
        product_id: productId,
        buyer_id: buyerId,
        seller_id: sellerId,
        amount: session.amount_total ? session.amount_total / 100 : 0, // Convert from cents
        status: 'paid',
        payment_intent_id: session.payment_intent as string
      });
  }

  // Update product status to 'sold'
  await supabase
    .from('products')
    .update({ status: 'sold' })
    .eq('id', productId);

  // Send notification to seller
  await supabase
    .from('messages')
    .insert({
      sender_id: buyerId,
      receiver_id: sellerId,
      content: `🎉 Sikeres vásárlás! A termék kifizetése megtörtént. A pénz letétben van, amíg a termék meg nem érkezik.`,
      product_id: productId,
      is_system_message: true
    });
}