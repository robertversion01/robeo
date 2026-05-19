import type Stripe from 'stripe';
import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { getStripeInstance } from '@/lib/stripe-client';
import { insertChatSystemMessage } from '@/lib/chatMessages';
import { buildPurchaseSellerMessage } from '@/lib/saleNotifications';
import { getSupabaseAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/** Vercel / naplók szűrése: `[stripe-webhook]` */
const WEBHOOK_LOG = '[stripe-webhook]';

/**
 * Stripe Dashboard → webhook események (minimum):
 * checkout.session.completed, payment_intent.succeeded,
 * payment_intent.payment_failed, charge.refunded
 */

const MAX_ERROR_LEN = 8000;
/** Nagy Stripe payload ellen (jsonb / sor méret) */
const MAX_EVENT_JSON_CHARS = 450_000;

function ok(): NextResponse {
  return NextResponse.json({ received: true }, { status: 200 });
}

function formatError(err: unknown): string {
  if (err instanceof Error) return err.message.slice(0, MAX_ERROR_LEN);
  if (typeof err === 'string') return err.slice(0, MAX_ERROR_LEN);
  try {
    return JSON.stringify(err, null, 2).slice(0, MAX_ERROR_LEN);
  } catch {
    return String(err).slice(0, MAX_ERROR_LEN);
  }
}

/** Supabase jsonb + Stripe auditnapló — sík objektum */
function stripeEventPayloadForDb(event: Stripe.Event): Record<string, unknown> {
  try {
    const raw = JSON.stringify(event);
    if (raw.length > MAX_EVENT_JSON_CHARS) {
      return {
        id: event.id,
        type: event.type,
        livemode: event.livemode,
        api_version: event.api_version,
        _payload_truncated: true,
        _payload_approx_chars: raw.length,
      };
    }
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {
      id: event.id,
      type: event.type,
      livemode: event.livemode,
      api_version: event.api_version,
    };
  }
}

function isStripeEventRowProcessed(row: {
  processed?: boolean | null;
  processed_at?: string | null;
  error?: string | null;
} | null): boolean {
  if (!row || row.error) return false;
  return row.processed === true || Boolean(row.processed_at);
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

  // Sikeres fizetés után a termék ne maradjon vásárolható (checkout success kliens RLS miatt gyakran kimarad).
  const { error: productSoldErr } = await db
    .from('products')
    .update({ status: 'sold' })
    .eq('id', transaction.product_id)
    .in('status', ['active', 'reserved']);

  if (productSoldErr) {
    throw new Error(`products sold update: ${productSoldErr.message}`);
  }

  if (!alreadyNotified) {
    const { data: buyerProfile, error: profileErr } = await db
      .from('profiles')
      .select(
        'full_name, name, email, location, address, city, postal_code, address_line1, address_line2'
      )
      .eq('id', transaction.buyer_id)
      .maybeSingle();

    if (profileErr) {
      console.error(WEBHOOK_LOG, 'profiles select failed', profileErr);
      throw new Error(`profiles select: ${profileErr.message}`);
    }

    let buyerAddress = 'Nincs megadva';

    if (buyerProfile) {
      buyerAddress =
        [
          buyerProfile.location,
          buyerProfile.address,
          buyerProfile.address_line1,
          buyerProfile.city,
          buyerProfile.postal_code,
        ]
          .filter(Boolean)
          .join(', ') ||
        buyerProfile.email ||
        'Nincs cím';
    }

    const sellerMessage = buildPurchaseSellerMessage(
      buyerAddress !== 'Nincs megadva' ? buyerAddress : undefined,
    );

    const messageResult = await insertChatSystemMessage(db, {
      senderId: transaction.buyer_id,
      receiverId: transaction.seller_id,
      content: sellerMessage,
      productId: transaction.product_id,
    });

    if (!messageResult.ok) {
      throw new Error(`messages insert: ${messageResult.error}`);
    }

    const { error: notifyErr } = await db
      .from('transactions')
      .update({
        checkout_completed_notified_at: new Date().toISOString(),
      })
      .eq('id', transaction.id);

    if (notifyErr) throw new Error(`transactions notify timestamp: ${notifyErr.message}`);
  }

  revalidatePath('/');
  revalidatePath('/favorites');
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
      console.error(WEBHOOK_LOG, 'missing promoterId for product promotion', {
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

  let transaction: TxRow | null = null;

  const { data: byPi, error: txErr } = await db
    .from('transactions')
    .select(
      'id, buyer_id, seller_id, product_id, status, payment_intent_id, checkout_completed_notified_at'
    )
    .eq('payment_intent_id', paymentIntentId)
    .maybeSingle();

  if (txErr) throw new Error(`transactions select (PI): ${txErr.message}`);
  transaction = byPi as TxRow | null;

  if (!transaction && pi.metadata?.transactionId) {
    const { data: byMeta, error: metaErr } = await db
      .from('transactions')
      .select(
        'id, buyer_id, seller_id, product_id, status, payment_intent_id, checkout_completed_notified_at'
      )
      .eq('id', pi.metadata.transactionId)
      .maybeSingle();
    if (metaErr) throw new Error(`transactions select (metadata): ${metaErr.message}`);
    transaction = byMeta as TxRow | null;
  }

  if (!transaction) {
    console.warn(WEBHOOK_LOG, 'payment_intent.succeeded: no transaction for PI', paymentIntentId);
    return;
  }

  await applyPaidTransactionEffects(db, transaction, paymentIntentId);
}

/** Ne írjuk felül a már „élő” vevői szállítási folyamatot */
const STATUSES_AFTER_PAYMENT = new Set<string>([
  'fizetve',
  'feladva',
  'uton',
  'atvetelre_var',
  'sikeresen_atveve',
  'funds_released',
  'refunded',
  'paid',
  'shipped',
  'delivered',
  'completed',
]);

/** Stripe hiba szöveg rövidítése; üres, ha nincs értelmes tartalom */
function formatStripeFailureDetail(raw: string): string {
  const t = raw.trim();
  if (!t) return '';
  const short = t.length > 160 ? `${t.slice(0, 157)}…` : t;
  return ` (${short})`;
}

async function handlePaymentIntentPaymentFailed(event: Stripe.Event, db: any): Promise<void> {
  const pi = event.data.object as Stripe.PaymentIntent;
  const paymentIntentId = pi.id;
  const reason =
    pi.last_payment_error?.message ||
    (typeof pi.last_payment_error?.code === 'string' ? pi.last_payment_error.code : '') ||
    '';

  const { data: transaction, error: txErr } = await db
    .from('transactions')
    .select(
      'id, buyer_id, seller_id, product_id, status, payment_intent_id, checkout_completed_notified_at'
    )
    .eq('payment_intent_id', paymentIntentId)
    .maybeSingle();

  if (txErr) throw new Error(`transactions select (PI failed): ${txErr.message}`);
  if (!transaction) {
    console.warn(WEBHOOK_LOG, 'payment_intent.payment_failed: no transaction', paymentIntentId);
    return;
  }

  if (STATUSES_AFTER_PAYMENT.has(transaction.status)) {
    console.warn(
      WEBHOOK_LOG,
      'payment_intent.payment_failed: skip — transaction already past checkout',
      transaction.id,
      transaction.status
    );
    return;
  }

  const { error: upErr } = await db
    .from('transactions')
    .update({ status: 'payment_failed' })
    .eq('id', transaction.id);

  if (upErr) throw new Error(`transactions payment_failed update: ${upErr.message}`);

  const detail = formatStripeFailureDetail(reason);
  const { error: msgErr } = await db.from('messages').insert([
    {
      sender_id: transaction.buyer_id,
      receiver_id: transaction.seller_id,
      content: `❌ A vevő fizetése nem sikerült${detail}. A vevő újrapróbálhatja a fizetést (checkout / termék oldal).`,
      product_id: transaction.product_id,
      message_type: 'system',
    },
    {
      sender_id: transaction.seller_id,
      receiver_id: transaction.buyer_id,
      content: `❌ A fizetésed nem sikerült${detail}. Ellenőrizd a kártyát és az egyenleget, majd próbáld újra a fizetést.`,
      product_id: transaction.product_id,
      message_type: 'system',
    },
  ]);

  if (msgErr) throw new Error(`messages insert (payment_failed): ${msgErr.message}`);
}

async function handleChargeRefunded(event: Stripe.Event, db: any): Promise<void> {
  const charge = event.data.object as Stripe.Charge;
  const piId =
    typeof charge.payment_intent === 'string'
      ? charge.payment_intent
      : charge.payment_intent?.id ?? null;

  if (!piId) {
    console.warn(WEBHOOK_LOG, 'charge.refunded: charge without payment_intent', charge.id);
    return;
  }

  const { data: transaction, error: txErr } = await db
    .from('transactions')
    .select(
      'id, buyer_id, seller_id, product_id, status, payment_intent_id, checkout_completed_notified_at'
    )
    .eq('payment_intent_id', piId)
    .maybeSingle();

  if (txErr) throw new Error(`transactions select (refund): ${txErr.message}`);
  if (!transaction) {
    console.warn(WEBHOOK_LOG, 'charge.refunded: no transaction', piId);
    return;
  }

  if (transaction.status === 'refunded') {
    return;
  }

  const { error: upErr } = await db
    .from('transactions')
    .update({ status: 'refunded' })
    .eq('id', transaction.id);

  if (upErr) throw new Error(`transactions refunded update: ${upErr.message}`);

  const cents = charge.amount_refunded;
  const amountLabel =
    typeof cents === 'number' && Number.isFinite(cents)
      ? (cents / 100).toFixed(2)
      : '';
  const curr = (charge.currency ?? 'huf').toUpperCase();
  const amountPart =
    amountLabel !== ''
      ? `${amountLabel} ${curr}`
      : 'az összeg';

  const { error: msgErr } = await db.from('messages').insert([
    {
      sender_id: transaction.buyer_id,
      receiver_id: transaction.seller_id,
      content: `💸 Visszatérítés történt a vevőnek: ${amountPart}. A banktól függően 5–10 munkanap alatt jelenhet meg.`,
      product_id: transaction.product_id,
      message_type: 'system',
    },
    {
      sender_id: transaction.seller_id,
      receiver_id: transaction.buyer_id,
      content: `💸 Visszatérítésed feldolgozva: ${amountPart}. A számládon néhány napon belül megjelenhet.`,
      product_id: transaction.product_id,
      message_type: 'system',
    },
  ]);

  if (msgErr) throw new Error(`messages insert (refund): ${msgErr.message}`);
}

async function ensureStripeEventRow(
  db: any,
  event: Stripe.Event
): Promise<'skip_done' | 'skip_inflight' | 'go'> {
  const stripeEventId = event.id;

  const { data: existing } = await db
    .from('stripe_webhook_events')
    .select('processed_at, error, processed')
    .eq('stripe_event_id', stripeEventId)
    .maybeSingle();

  if (isStripeEventRowProcessed(existing)) {
    return 'skip_done';
  }

  const { error: insertErr } = await db.from('stripe_webhook_events').insert({
    stripe_event_id: stripeEventId,
    received_at: new Date().toISOString(),
    event_type: event.type,
    payload: stripeEventPayloadForDb(event),
    processed: false,
  });

  if (!insertErr) {
    return 'go';
  }

  if (insertErr.code !== '23505') {
    throw new Error(`stripe_webhook_events insert: ${insertErr.message}`);
  }

  const { data: row } = await db
    .from('stripe_webhook_events')
    .select('processed_at, error, processed')
    .eq('stripe_event_id', stripeEventId)
    .maybeSingle();

  if (isStripeEventRowProcessed(row)) {
    return 'skip_done';
  }

  const inflight =
    row &&
    !row.error &&
    row.processed !== true &&
    !row.processed_at;
  if (inflight) {
    return 'skip_inflight';
  }

  return 'go';
}

async function markEventSuccess(db: any, stripeEventId: string): Promise<void> {
  const { error } = await db
    .from('stripe_webhook_events')
    .update({
      processed: true,
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
      processed: false,
      error: message.slice(0, MAX_ERROR_LEN),
    })
    .eq('stripe_event_id', stripeEventId);

  if (error) {
    console.error(WEBHOOK_LOG, 'failed to persist error column', error);
  }
}

export async function POST(req: NextRequest) {
  let stripeEventId: string | null = null;

  try {
    const stripe = getStripeInstance();
    const admin = getSupabaseAdminClient();

    if (!stripe) {
      console.error(WEBHOOK_LOG, 'Stripe client unavailable');
      return ok();
    }

    if (!admin) {
      console.error(WEBHOOK_LOG, 'SUPABASE_SERVICE_ROLE_KEY missing — admin client required');
      return ok();
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const signature = req.headers.get('stripe-signature');

    if (!webhookSecret || !signature) {
      console.error(WEBHOOK_LOG, 'STRIPE_WEBHOOK_SECRET or stripe-signature header missing');
      return ok();
    }

    const rawBody = await req.text();

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (verifyErr) {
      console.error(WEBHOOK_LOG, 'constructEvent failed', verifyErr);
      return ok();
    }

    stripeEventId = event.id;

    const gate = await ensureStripeEventRow(admin, event);
    if (gate === 'skip_done' || gate === 'skip_inflight') {
      return ok();
    }

    try {
      if (event.type === 'checkout.session.completed') {
        await handleCheckoutSessionCompleted(event, admin);
      } else if (event.type === 'payment_intent.succeeded') {
        await handlePaymentIntentSucceeded(event, admin);
      } else if (event.type === 'payment_intent.payment_failed') {
        await handlePaymentIntentPaymentFailed(event, admin);
      } else if (event.type === 'charge.refunded') {
        await handleChargeRefunded(event, admin);
      } else {
        console.info(WEBHOOK_LOG, 'acknowledged (no domain handler)', event.type);
      }

      await markEventSuccess(admin, stripeEventId);
    } catch (handlerErr) {
      console.error(WEBHOOK_LOG, 'handler error', handlerErr);
      await markEventFailure(admin, stripeEventId, formatError(handlerErr));
    }

    return ok();
  } catch (fatal) {
    console.error(WEBHOOK_LOG, 'unexpected failure', fatal);
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
