import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createFoxpostShipment } from '@/lib/foxpostClient';
import { getSupabaseAdminClient } from '@/lib/supabase';
import { isPaidStatus, TX_STATUS } from '@/lib/transactionFlow';
import { notifyTransactionStatusBothParties } from '@/lib/shippingNotifications';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) {
      return NextResponse.json({ error: 'Auth config missing' }, { status: 500 });
    }

    const authClient = createClient(url, anon);
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const body = await req.json();
    const { transactionId } = body as { transactionId?: string };
    if (!transactionId) {
      return NextResponse.json({ error: 'transactionId required' }, { status: 400 });
    }

    const db = getSupabaseAdminClient();
    if (!db) {
      return NextResponse.json({ error: 'Service role required' }, { status: 500 });
    }

    const { data: tx, error: txErr } = await db
      .from('transactions')
      .select(
        'id, status, product_id, buyer_id, seller_id, foxpost_terminal_id, foxpost_terminal_name, foxpost_terminal_address, tracking_number',
      )
      .eq('id', transactionId)
      .maybeSingle();

    if (txErr || !tx) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    if (tx.seller_id !== user.id) {
      return NextResponse.json({ error: 'Only the seller can generate labels' }, { status: 403 });
    }

    if (!isPaidStatus(tx.status) && tx.status !== TX_STATUS.FELADVA) {
      return NextResponse.json(
        { error: 'A címke csak kifizetett rendeléshez generálható.' },
        { status: 400 },
      );
    }

    const { data: product } = await db
      .from('products')
      .select('name')
      .eq('id', tx.product_id)
      .maybeSingle();

    const { data: sellerProfile } = await db
      .from('profiles')
      .select('email, full_name, name')
      .eq('id', tx.seller_id)
      .maybeSingle();

    const { data: buyerProfile } = await db
      .from('profiles')
      .select('email, full_name, name')
      .eq('id', tx.buyer_id)
      .maybeSingle();

    let trackingNumber = tx.tracking_number as string | null;
    let shipmentMode: 'existing' | 'new' = 'existing';

    if (!trackingNumber) {
      const shipment = await createFoxpostShipment({
        transactionId: tx.id,
        productName: product?.name || 'Termék',
        sellerId: tx.seller_id,
        buyerId: tx.buyer_id,
        terminalId: tx.foxpost_terminal_id,
        terminalName: tx.foxpost_terminal_name,
        terminalAddress: tx.foxpost_terminal_address,
        sellerEmail: sellerProfile?.email,
        buyerName: buyerProfile?.full_name || buyerProfile?.name || buyerProfile?.email,
      });
      trackingNumber = shipment.trackingNumber;
      shipmentMode = 'new';

      const now = new Date().toISOString();
      const { error: updateErr } = await db
        .from('transactions')
        .update({
          tracking_number: trackingNumber,
          tracking_carrier: 'foxpost',
          status: TX_STATUS.FELADVA,
          label_generated_at: now,
          updated_at: now,
        })
        .eq('id', tx.id);

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }

      await notifyTransactionStatusBothParties(
        db,
        {
          product_id: tx.product_id,
          buyer_id: tx.buyer_id,
          seller_id: tx.seller_id,
          product: { name: product?.name },
        },
        TX_STATUS.FELADVA,
      );
    }

    return NextResponse.json({
      ok: true,
      trackingNumber,
      status: TX_STATUS.FELADVA,
      shipmentMode,
      label: {
        transactionId: tx.id,
        productName: product?.name || 'Termék',
        sellerEmail: sellerProfile?.email,
        foxpostTerminalId: tx.foxpost_terminal_id,
        foxpostTerminalName: tx.foxpost_terminal_name,
        foxpostTerminalAddress: tx.foxpost_terminal_address,
        trackingNumber,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Label generation failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
