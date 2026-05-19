import type Stripe from 'stripe';

type TransactionPaymentRefs = {
  payment_intent_id?: string | null;
  checkout_session_id?: string | null;
};

/** Stripe PI feloldása DB mezőből, kérésből vagy Checkout Session-ből. */
export async function resolveTransactionPaymentIntentId(
  stripe: Stripe,
  transaction: TransactionPaymentRefs,
  bodyPaymentIntentId?: string | null,
): Promise<string | null> {
  const fromBody = bodyPaymentIntentId?.trim();
  if (fromBody) return fromBody;

  const fromDb = transaction.payment_intent_id?.trim();
  if (fromDb) return fromDb;

  const sessionId = transaction.checkout_session_id?.trim();
  if (!sessionId) return null;

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const pi = session.payment_intent;
    if (typeof pi === 'string' && pi) return pi;
    if (pi && typeof pi === 'object' && 'id' in pi && typeof pi.id === 'string') {
      return pi.id;
    }
  } catch (err) {
    console.warn('[resolveTransactionPaymentIntentId] checkout session retrieve failed', err);
  }

  return null;
}

/** Manual capture — ha már succeeded, ne bukjon el a megerősítés. */
export async function capturePaymentIntentSafe(
  stripe: Stripe,
  paymentIntentId: string,
): Promise<void> {
  try {
    await stripe.paymentIntents.capture(paymentIntentId);
  } catch (err: unknown) {
    const existing = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (existing.status === 'succeeded') {
      return;
    }
    throw err;
  }
}
