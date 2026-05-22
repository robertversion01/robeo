import { NextRequest, NextResponse } from 'next/server';
import { assertAdminRequest } from '@/lib/adminAuth';
import { insertChatSystemMessage } from '@/lib/chatMessages';
import { getSupabaseAdminClient } from '@/lib/supabase';
import { getStripeInstance } from '@/lib/stripe-client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const admin = await assertAdminRequest(req);
  if (!admin.ok) return admin.res;

  const db = getSupabaseAdminClient();
  if (!db) {
    return NextResponse.json({ error: 'Service role required' }, { status: 500 });
  }

  const statusFilter = req.nextUrl.searchParams.get('status') || 'open';

  let query = db
    .from('disputes')
    .select(
      'id, transaction_id, reporter_id, reason, details, status, admin_note, created_at, resolved_at, transactions(id, amount, status, buyer_id, seller_id, product_id, payment_intent_id, products(id, name, image_url))',
    )
    .order('created_at', { ascending: false })
    .limit(80);

  if (statusFilter !== 'all') {
    if (statusFilter === 'open') {
      query = query.in('status', ['open', 'under_review']);
    } else {
      query = query.eq('status', statusFilter);
    }
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    disputes: data || [],
    openCount: (data || []).filter((d) => (d as { status: string }).status === 'open').length,
  });
}

export async function PATCH(req: NextRequest) {
  const admin = await assertAdminRequest(req);
  if (!admin.ok) return admin.res;

  const db = getSupabaseAdminClient();
  if (!db) {
    return NextResponse.json({ error: 'Service role required' }, { status: 500 });
  }

  const body = await req.json();
  const { disputeId, action, adminNote } = body as {
    disputeId?: string;
    action?: 'refund' | 'reject' | 'review';
    adminNote?: string;
  };

  if (!disputeId || !action) {
    return NextResponse.json({ error: 'disputeId and action required' }, { status: 400 });
  }

  const { data: dispute, error: dErr } = await db
    .from('disputes')
    .select('id, transaction_id, reporter_id, status, transactions(id, buyer_id, seller_id, product_id, status, payment_intent_id, amount)')
    .eq('id', disputeId)
    .maybeSingle();

  if (dErr || !dispute) {
    return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });
  }

  const txRaw = (dispute as { transactions: unknown }).transactions;
  const tx = (Array.isArray(txRaw) ? txRaw[0] : txRaw) as {
    id: string;
    buyer_id: string;
    seller_id: string;
    product_id: string;
    status: string;
    payment_intent_id: string | null;
    amount: number;
  } | null;

  if (!tx) {
    return NextResponse.json({ error: 'Transaction missing' }, { status: 404 });
  }

  const now = new Date().toISOString();
  const note = adminNote?.trim() || null;

  if (action === 'review') {
    const { error } = await db
      .from('disputes')
      .update({ status: 'under_review', admin_note: note, updated_at: now })
      .eq('id', disputeId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await db.from('transactions').update({ dispute_status: 'under_review' }).eq('id', tx.id);
    return NextResponse.json({ ok: true, status: 'under_review' });
  }

  if (action === 'refund') {
    const stripe = getStripeInstance();
    if (tx.payment_intent_id && stripe) {
      try {
        await stripe.refunds.create({ payment_intent: tx.payment_intent_id });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Stripe refund failed';
        return NextResponse.json({ error: msg }, { status: 502 });
      }
    } else {
      await db.from('transactions').update({ status: 'refunded' }).eq('id', tx.id);
    }

    await db
      .from('disputes')
      .update({
        status: 'resolved_refund',
        admin_note: note,
        resolved_at: now,
        resolved_by: admin.userId,
        updated_at: now,
      })
      .eq('id', disputeId);

    await db
      .from('transactions')
      .update({ dispute_status: 'resolved_refund', status: 'refunded' })
      .eq('id', tx.id);

    const refundMsg = note
      ? `✅ Vitád elfogadva — visszatérítés folyamatban (${note}).`
      : '✅ Vitád elfogadva — visszatérítés folyamatban.';

    await insertChatSystemMessage(db, {
      senderId: admin.userId,
      receiverId: tx.buyer_id,
      content: refundMsg,
      productId: tx.product_id,
    });
    await insertChatSystemMessage(db, {
      senderId: admin.userId,
      receiverId: tx.seller_id,
      content: `ℹ️ A vevő vitája visszatérítéssel zárult. A tranzakció stornózva.`,
      productId: tx.product_id,
    });

    return NextResponse.json({ ok: true, status: 'resolved_refund' });
  }

  if (action === 'reject') {
    const restoreStatus = tx.status === 'dispute_open' ? 'sikeresen_atveve' : tx.status;

    await db
      .from('disputes')
      .update({
        status: 'resolved_reject',
        admin_note: note,
        resolved_at: now,
        resolved_by: admin.userId,
        updated_at: now,
      })
      .eq('id', disputeId);

    await db
      .from('transactions')
      .update({
        dispute_status: 'resolved_reject',
        status: restoreStatus === 'refunded' ? 'sikeresen_atveve' : restoreStatus,
      })
      .eq('id', tx.id);

    const rejectMsg = note
      ? `ℹ️ Vitád elutasítva: ${note}`
      : 'ℹ️ Vitád elutasítva — a rendelés érvényben marad.';

    await insertChatSystemMessage(db, {
      senderId: admin.userId,
      receiverId: tx.buyer_id,
      content: rejectMsg,
      productId: tx.product_id,
    });
    await insertChatSystemMessage(db, {
      senderId: admin.userId,
      receiverId: tx.seller_id,
      content: 'ℹ️ A vevő vitája elutasításra került.',
      productId: tx.product_id,
    });

    return NextResponse.json({ ok: true, status: 'resolved_reject' });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
