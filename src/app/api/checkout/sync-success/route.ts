import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';
import { applyPaidTransactionEffects } from '@/lib/completePurchase';
import { resolveBundleDisplayItems, isBundleTransaction } from '@/lib/bundleLineItems';
import { getStripeInstance } from '@/lib/stripe-client';
import { getSupabaseAdminClient } from '@/lib/supabase';
import { isSupabaseSchemaError } from '@/lib/supabaseResilience';
import { isPaidStatus } from '@/lib/transactionFlow';

export const dynamic = 'force-dynamic';

const TX_SELECT =
  'id, buyer_id, seller_id, product_id, status, amount, fee, shipping_cost, payment_intent_id, checkout_session_id, checkout_completed_notified_at, wallet_pending_credited_at, wallet_released_at, bundle_product_ids, bundle_item_count';
const TX_SELECT_MINIMAL =
  'id, buyer_id, seller_id, product_id, status, amount, checkout_session_id, payment_intent_id, bundle_product_ids, bundle_item_count';

type TxRow = {
  id: string;
  buyer_id: string;
  seller_id: string;
  product_id: string;
  status: string;
  amount: number;
  fee?: number | null;
  shipping_cost?: number | null;
  payment_intent_id?: string | null;
  checkout_session_id?: string | null;
  checkout_completed_notified_at?: string | null;
  bundle_product_ids?: string | null;
  bundle_item_count?: number | null;
};

function resolveSupabaseAnonKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY
  );
}

function bundleProductIdsFromSession(session: Stripe.Checkout.Session): string[] | undefined {
  if (session.metadata?.bundle !== 'true') return undefined;
  const raw = session.metadata?.productIds?.trim();
  if (!raw) return undefined;
  const ids = raw.split(',').map((s) => s.trim()).filter(Boolean);
  return ids.length >= 2 ? ids : undefined;
}

async function loadTransaction(
  db: ReturnType<typeof getSupabaseAdminClient>,
  filters: { sessionId?: string; transactionId?: string },
): Promise<{ data: TxRow | null; error: string | null }> {
  if (!db) return { data: null, error: 'Service unavailable' };

  for (const columns of [TX_SELECT, TX_SELECT_MINIMAL]) {
    let query = db.from('transactions').select(columns);
    if (filters.sessionId) query = query.eq('checkout_session_id', filters.sessionId);
    if (filters.transactionId) query = query.eq('id', filters.transactionId);
    const { data, error } = await query.maybeSingle();
    if (!error && data) return { data: data as unknown as TxRow, error: null };
    if (error && !isSupabaseSchemaError(error)) {
      return { data: null, error: error.message };
    }
  }
  return { data: null, error: null };
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return NextResponse.json({ error: 'Nincs bejelentkezve.' }, { status: 401 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = resolveSupabaseAnonKey();
    if (!url || !anon) {
      return NextResponse.json({ error: 'Auth config missing' }, { status: 500 });
    }

    const authClient = createClient(url, anon);
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Érvénytelen munkamenet.' }, { status: 401 });
    }

    const body = (await req.json()) as { sessionId?: string; transactionId?: string };
    const sessionId = body.sessionId?.trim();
    const transactionId = body.transactionId?.trim();
    if (!sessionId && !transactionId) {
      return NextResponse.json({ error: 'sessionId vagy transactionId kötelező' }, { status: 400 });
    }

    const db = getSupabaseAdminClient();
    if (!db) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 500 });
    }

    const loaded = sessionId
      ? await loadTransaction(db, { sessionId })
      : await loadTransaction(db, { transactionId });
    if (loaded.error) {
      return NextResponse.json({ error: loaded.error }, { status: 500 });
    }
    const transaction = loaded.data;
    if (!transaction) {
      return NextResponse.json({ error: 'A tranzakció nem található.' }, { status: 404 });
    }

    if (transaction.buyer_id !== user.id) {
      return NextResponse.json({ error: 'Csak a vevő nyithatja meg ezt az oldalt.' }, { status: 403 });
    }

    let paymentIntentId = transaction.payment_intent_id ?? null;

    if (sessionId && !isPaidStatus(transaction.status)) {
      const stripe = getStripeInstance();
      if (!stripe) {
        return NextResponse.json({ error: 'Stripe nincs konfigurálva.' }, { status: 500 });
      }

      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status !== 'paid') {
        return NextResponse.json({ error: 'A fizetés még nem lett véglegesítve.' }, { status: 402 });
      }

      paymentIntentId =
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id ?? paymentIntentId;

      await applyPaidTransactionEffects(db, transaction, paymentIntentId, {
        bundleProductIds: bundleProductIdsFromSession(session),
      });

      const refreshed = await loadTransaction(db, { transactionId: transaction.id });
      if (refreshed.data) {
        Object.assign(transaction, refreshed.data);
      }
    }

    const { data: product, error: productError } = await db
      .from('products')
      .select('*')
      .eq('id', transaction.product_id)
      .maybeSingle();

    if (productError || !product) {
      return NextResponse.json({ error: 'A termék nem található.' }, { status: 404 });
    }

    let bundleItems: Awaited<ReturnType<typeof resolveBundleDisplayItems>> = [];
    if (isBundleTransaction(transaction)) {
      bundleItems = await resolveBundleDisplayItems(db, {
        id: transaction.id,
        product_id: transaction.product_id,
        bundle_product_ids: transaction.bundle_product_ids ?? null,
      });
    }

    return NextResponse.json({
      ok: true,
      transaction: { ...transaction, product },
      product,
      bundleItems,
      saleBroadcast: {
        sellerId: transaction.seller_id,
        buyerId: transaction.buyer_id,
        productId: product.id,
        productName: product.name || 'Termék',
        transactionId: transaction.id,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Sync failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
