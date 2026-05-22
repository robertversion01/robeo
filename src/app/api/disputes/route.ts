import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { insertChatSystemMessage } from '@/lib/chatMessages';
import {
  canBuyerOpenDispute,
  fetchDisputeForTransaction,
  normalizeDisputeReason,
} from '@/lib/disputes';
import { getSupabaseAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function authUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  const authClient = createClient(url, anon);
  const { data: { user } } = await authClient.auth.getUser(token);
  return user;
}

export async function GET(req: NextRequest) {
  const user = await authUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const transactionId = req.nextUrl.searchParams.get('transactionId')?.trim();
  if (!transactionId) {
    return NextResponse.json({ error: 'transactionId required' }, { status: 400 });
  }

  const db = getSupabaseAdminClient();
  if (!db) {
    return NextResponse.json({ error: 'Service role required' }, { status: 500 });
  }

  const { data: tx } = await db
    .from('transactions')
    .select('id, buyer_id, seller_id, dispute_status')
    .eq('id', transactionId)
    .maybeSingle();

  if (!tx) {
    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
  }

  if (tx.buyer_id !== user.id && tx.seller_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const dispute = await fetchDisputeForTransaction(db, transactionId);
  return NextResponse.json({ dispute, disputeStatus: tx.dispute_status ?? null });
}

export async function POST(req: NextRequest) {
  const user = await authUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { transactionId, reason, details } = body as {
    transactionId?: string;
    reason?: string;
    details?: string;
  };

  if (!transactionId?.trim()) {
    return NextResponse.json({ error: 'transactionId required' }, { status: 400 });
  }

  const detailText = details?.trim() || '';
  if (detailText.length < 10) {
    return NextResponse.json({ error: 'Adj meg legalább 10 karakteres leírást.' }, { status: 400 });
  }

  const db = getSupabaseAdminClient();
  if (!db) {
    return NextResponse.json({ error: 'Service role required' }, { status: 500 });
  }

  const { data: tx, error: txErr } = await db
    .from('transactions')
    .select('id, status, buyer_id, seller_id, product_id, dispute_status, payment_intent_id')
    .eq('id', transactionId)
    .maybeSingle();

  if (txErr || !tx) {
    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
  }

  if (tx.buyer_id !== user.id) {
    return NextResponse.json({ error: 'Csak a vevő nyithat vitát.' }, { status: 403 });
  }

  if (!canBuyerOpenDispute(tx.status, tx.dispute_status)) {
    return NextResponse.json(
      { error: 'Ehhez a rendeléshez jelenleg nem nyithatsz vitát.' },
      { status: 400 },
    );
  }

  const existing = await fetchDisputeForTransaction(db, transactionId);
  if (existing && ['open', 'under_review', 'resolved_refund'].includes(existing.status)) {
    return NextResponse.json({ error: 'Már van aktív vagy lezárt vitád ehhez a rendeléshez.' }, { status: 409 });
  }

  const normalizedReason = normalizeDisputeReason(reason || 'other');
  const now = new Date().toISOString();

  const { data: dispute, error: insertErr } = await db
    .from('disputes')
    .insert({
      transaction_id: transactionId,
      reporter_id: user.id,
      reason: normalizedReason,
      details: detailText,
      status: 'open',
      updated_at: now,
    })
    .select('id, status, created_at')
    .single();

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  await db
    .from('transactions')
    .update({ dispute_status: 'open', status: 'dispute_open' })
    .eq('id', transactionId);

  const { data: product } = await db
    .from('products')
    .select('name')
    .eq('id', tx.product_id)
    .maybeSingle();

  const productName = (product as { name?: string } | null)?.name || 'termék';

  await insertChatSystemMessage(db, {
    senderId: user.id,
    receiverId: tx.seller_id,
    content: `⚠️ A vevő vitát nyitott: „${productName}”. Indok: ${normalizedReason}. Admin felülvizsgálat alatt.`,
    productId: tx.product_id,
  });

  await insertChatSystemMessage(db, {
    senderId: tx.seller_id,
    receiverId: user.id,
    content: `⚠️ Vitád rögzítve (${productName}). Hamarosan felülvizsgáljuk — 24–48 órán belül jelzünk.`,
    productId: tx.product_id,
  });

  return NextResponse.json({ ok: true, dispute });
}
