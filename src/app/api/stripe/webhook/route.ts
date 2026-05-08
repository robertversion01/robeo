import type Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import { getStripeInstance } from '@/lib/stripe-client';
import { getSupabaseAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const MAX_ERROR_LEN = 8000;

function ok(): NextResponse {
  return NextResponse.json({ received: true }, { status: 200 });
}

function formatError(err: unknown): string {
  if (err instanceof Error) return err.message.slice(0, MAX_ERROR_LEN);
  try {
    return JSON.stringify(err).slice(0, MAX_ERROR_LEN);
  } catch {
    return String(err).slice(0, MAX_ERROR_LEN);
  }
}

type TxRow = {
  id: string;
  buyer_id: string;
  seller_id: string;
  product_id: string;
  status: string;
  payment_intent_id: string | null;
  checkout_completed_notified_at: string | null;
};

async function applyPaidTransactionEffects(
  db: any,
  transaction: TxRow,
  paymentIntentId: string | null
): Promise<void> {
  const needsStatusUpdate = transaction.status !== 'fizetve';
  const alreadyNotified = Boolean(transaction.checkout_completed_notified_at);

  if (needsStatusUpdate) {
    const { error } = await db
      .from('transactions')
      .update({
        status: 'fizetve',
        payment_intent_id: paymentIntentId ?? transaction.payment_intent_id ?? null,
      })
      .eq('id', transaction.id);

    if (error) throw new Error(`transactions update: ${error.message}`);
  }

  if (!alreadyNotified) {
    const { data: buyerProfile, error: profileErr } = await db
      .from('profiles')
      .select('location, full_name')
      .eq('id', transaction.buyer_id)
      .maybeSingle();

    if (profileErr) throw new Error(`profiles select: ${profileErr.message}`);

    const buyerAddress = buyerProfile?.location || 'Nincs megadva';
    const { error: messageError } = await db.from('messages').insert({
      sender_id: transaction.buyer_id,
      receiver_id: transaction.seller_id,
      content: `✅ Eladtad a terméket! Itt a vevő címe: ${buyerAddress}`,
      product_id: transaction.product_id,
      is_system_message: true,
      message_type: 'system',
    });

    if (messageError) throw new Error(`messages insert: ${messageError.message}`);

    const { error: notifyErr } = await db
      .from('transactions')
      .update({
        checkout_completed_notified_at: new Date().toISOString(),
      })
      .eq('id', transaction.id);

    if (notifyErr) throw new Error(`transactions notify timestamp: ${notifyErr.message}`);
  }
}

async function handleCheckoutSessionCompleted(event: Stripe.Event, db: any): Promise<void> {
  const session = event.data.object as Stripe.Checkout.Session;
  const checkoutSessionId = session.id;
  const piFromSession =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  const metadataType = session.metadata?.type;

  if (metadataType === 'product_promotion') {
    const promotedProductId = session.metadata?.productId;
    const promoterId = session.metadata?.promoterId;
    const featuredUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    if (promotedProductId && !promoterId) {
      console.error('[stripe-webhook] missing promoterId for product promotion', {
        promotedProductId,
        checkoutSessionId,
      });
      return;
    }

    if (promotedProductId && promoterId) {
      const { data: productRow } = await db
        .from('products')
        .select('featured_checkout_session_id')
        .eq('id', promotedProductId)
        .eq('user_id', promoterId)
        .maybeSingle();

      if (productRow?.featured_checkout_session_id === checkoutSessionId) {
        return;
      }

      const { error: promoteError } = await db
        .from('products')
        .update({
          featured_until: featuredUntil,
          featured_checkout_session_id: checkoutSessionId,
        })
        .eq('id', promotedProductId)
        .eq('user_id', promoterId);

      if (promoteError) {
        throw new Error(`product promotion update: ${promoteError.message}`);
      }
    }

    return;
  }

  const { data: transaction, error: txErr } = await db
    .from('transactions')
    .select(
      'id, buyer_id, seller_id, product_id, status, payment_intent_id, checkout_completed_notified_at'
    )
    .eq('checkout_session_id', checkoutSessionId)
    .maybeSingle();

  if (txErr) throw new Error(`transactions select: ${txErr.message}`);
  if (!transaction) {
    throw new Error(`no transaction for checkout_session_id=${checkoutSessionId}`);
  }

  await applyPaidTransactionEffects(db, transaction as TxRow, piFromSession);
}

async function handlePaymentIntentSucceeded(event: Stripe.Event, db: any): Promise<void> {
  const pi = event.data.object as Stripe.PaymentIntent;
  const paymentIntentId = pi.id;

  const { data: transaction, error: txErr } = await db
    .from('transactions')
    .select(
      'id, buyer_id, seller_id, product_id, status, payment_intent_id, checkout_completed_notified_at'
    )
    .eq('payment_intent_id', paymentIntentId)
    .maybeSingle();

  if (txErr) throw new Error(`transactions select (PI): ${txErr.message}`);
  if (!transaction) {
    console.warn('[stripe-webhook] payment_intent.succeeded: no transaction for PI', paymentIntentId);
    return;
  }

  await applyPaidTransactionEffects(db, transaction as TxRow, paymentIntentId);
}

async function ensureStripeEventRow(db: any, stripeEventId: string): Promise<'skip_done' | 'skip_inflight' | 'go'> {
  const { data: existing } = await db
    .from('stripe_webhook_events')
    .select('processed_at, error')
    .eq('stripe_event_id', stripeEventId)
    .maybeSingle();

  if (existing?.processed_at && !existing.error) {
    return 'skip_done';
  }

  const { error: insertErr } = await db.from('stripe_webhook_events').insert({
    stripe_event_id: stripeEventId,
    received_at: new Date().toISOString(),
  });

  if (!insertErr) {
    return 'go';
  }

  if (insertErr.code !== '23505') {
    throw new Error(`stripe_webhook_events insert: ${insertErr.message}`);
  }

  const { data: row } = await db
    .from('stripe_webhook_events')
    .select('processed_at, error')
    .eq('stripe_event_id', stripeEventId)
    .maybeSingle();

  if (row?.processed_at && !row.error) {
    return 'skip_done';
  }

  if (row && !row.processed_at && !row.error) {
    return 'skip_inflight';
  }

  return 'go';
}

async function markEventSuccess(db: any, stripeEventId: string): Promise<void> {
  const { error } = await db
    .from('stripe_webhook_events')
    .update({
      processed_at: new Date().toISOString(),
      error: null,
    })
    .eq('stripe_event_id', stripeEventId);

  if (error) throw new Error(`stripe_webhook_events success update: ${error.message}`);
}

async function markEventFailure(db: any, stripeEventId: string, message: string): Promise<void> {
  const { error } = await db
    .from('stripe_webhook_events')
    .update({
      error: message.slice(0, MAX_ERROR_LEN),
    })
    .eq('stripe_event_id', stripeEventId);

  if (error) {
    console.error('[stripe-webhook] failed to persist error column', error);
  }
}

export async function POST(req: NextRequest) {
  let stripeEventId: string | null = null;

  try {
    const stripe = getStripeInstance();
    const admin = getSupabaseAdminClient();

    if (!stripe) {
      console.error('[stripe-webhook] Stripe client unavailable');
      return ok();
    }

    if (!admin) {
      console.error('[stripe-webhook] SUPABASE_SERVICE_ROLE_KEY missing — admin client required');
      return ok();
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const signature = req.headers.get('stripe-signature');

    if (!webhookSecret || !signature) {
      console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET or stripe-signature header missing');
      return ok();
    }

    const rawBody = await req.text();

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (verifyErr) {
      console.error('[stripe-webhook] constructEvent failed', verifyErr);
      return ok();
    }

    stripeEventId = event.id;

    const gate = await ensureStripeEventRow(admin, stripeEventId);
    if (gate === 'skip_done' || gate === 'skip_inflight') {
      return ok();
    }

    try {
      if (event.type === 'checkout.session.completed') {
        await handleCheckoutSessionCompleted(event, admin);
      } else if (event.type === 'payment_intent.succeeded') {
        await handlePaymentIntentSucceeded(event, admin);
      }

      await markEventSuccess(admin, stripeEventId);
    } catch (handlerErr) {
      console.error('[stripe-webhook] handler error', handlerErr);
      await markEventFailure(admin, stripeEventId, formatError(handlerErr));
    }

    return ok();
  } catch (fatal) {
    console.error('[stripe-webhook] unexpected failure', fatal);
    if (stripeEventId) {
      try {
        const admin = getSupabaseAdminClient();
        if (admin) {
          await markEventFailure(admin, stripeEventId, formatError(fatal));
        }
      } catch {
        /* ignore */
      }
    }
    return ok();
  }
}
