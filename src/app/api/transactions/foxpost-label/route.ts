import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createFoxpostShipment } from '@/lib/foxpostClient';
import { getSupabaseAdminClient } from '@/lib/supabase';
import { isPaidStatus, TX_STATUS } from '@/lib/transactionFlow';
import { notifyTransactionStatusBothParties } from '@/lib/shippingNotifications';
import {
  fetchProfileRow,
  fetchTransactionWithColumnFallback,
  isMissingColumnError,
  TX_LABEL_SELECT_SETS,
} from '@/lib/supabaseResilience';

export const dynamic = 'force-dynamic';

type LabelTransactionRow = {
  id: string;
  status: string;
  product_id: string;
  buyer_id: string;
  seller_id: string;
  tracking_number?: string | null;
  foxpost_terminal_id?: string | null;
  foxpost_terminal_name?: string | null;
  foxpost_terminal_address?: string | null;
};

function resolveSupabaseAnonKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY
  );
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

    const body = await req.json();
    const { transactionId, productId, buyerId } = body as {
      transactionId?: string;
      productId?: string;
      buyerId?: string;
    };
    if (!transactionId && !productId) {
      return NextResponse.json({ error: 'transactionId vagy productId kötelező' }, { status: 400 });
    }

    const db = getSupabaseAdminClient();
    if (!db) {
      return NextResponse.json({ error: 'Service role required' }, { status: 500 });
    }

    let txResult = await fetchTransactionWithColumnFallback<LabelTransactionRow>(
      db,
      transactionId ? { id: transactionId } : { productId, sellerId: user.id, buyerId },
      TX_LABEL_SELECT_SETS,
    );

    if (!txResult.data && !txResult.error && transactionId && productId) {
      txResult = await fetchTransactionWithColumnFallback<LabelTransactionRow>(
        db,
        { productId, sellerId: user.id, buyerId },
        TX_LABEL_SELECT_SETS,
      );
    }

    const tx = txResult.data;
    const txErr = txResult.error;

    if (txErr) {
      return NextResponse.json(
        { error: txErr.message || 'Tranzakció lekérdezési hiba.' },
        { status: 500 },
      );
    }
    if (!tx) {
      return NextResponse.json({ error: 'A tranzakció nem található.' }, { status: 404 });
    }

    if (tx.seller_id !== user.id) {
      return NextResponse.json({ error: 'Csak az eladó nyomtathat címkét.' }, { status: 403 });
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

    const sellerProfile = await fetchProfileRow<{ email?: string | null; full_name?: string | null; name?: string | null }>(
      db,
      tx.seller_id,
      ['email, full_name, name', 'email, name', 'email'],
    );

    const buyerProfile = await fetchProfileRow<{ email?: string | null; full_name?: string | null; name?: string | null }>(
      db,
      tx.buyer_id,
      ['email, full_name, name', 'email, name', 'email'],
    );

    let trackingNumber = tx.tracking_number ?? null;
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
          status: TX_STATUS.FELADVA,
          updated_at: now,
        })
        .eq('id', tx.id);

      if (updateErr && isMissingColumnError(updateErr)) {
        const { error: minimalErr } = await db
          .from('transactions')
          .update({
            tracking_number: trackingNumber,
            status: TX_STATUS.FELADVA,
          })
          .eq('id', tx.id);
        if (minimalErr) {
          return NextResponse.json({ error: minimalErr.message }, { status: 500 });
        }
      } else if (updateErr) {
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

    const buyerDisplayName =
      buyerProfile?.full_name || buyerProfile?.name || buyerProfile?.email || null;

    return NextResponse.json({
      ok: true,
      trackingNumber,
      status: TX_STATUS.FELADVA,
      shipmentMode,
      label: {
        transactionId: tx.id,
        productName: product?.name || 'Termék',
        sellerEmail: sellerProfile?.email ?? null,
        buyerName: buyerDisplayName,
        buyerAddress: tx.foxpost_terminal_address ?? null,
        foxpostTerminalId: tx.foxpost_terminal_id ?? null,
        foxpostTerminalName: tx.foxpost_terminal_name ?? null,
        foxpostTerminalAddress: tx.foxpost_terminal_address ?? null,
        trackingNumber,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Label generation failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
