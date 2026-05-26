import { NextRequest, NextResponse } from 'next/server';
import { getStripeInstance } from '@/lib/stripe-client';
import { getSupabaseAdminClient, getSupabaseClient } from '@/lib/supabase';
import { TX_STATUS, canBuyerConfirmReceipt } from '@/lib/transactionFlow';
import {
  capturePaymentIntentSafe,
  resolveTransactionPaymentIntentId,
} from '@/lib/transactionPaymentIntent';
import {
  creditSellerPendingForTransaction,
  releaseSellerWalletForTransaction,
} from '@/lib/wallet';
import { notifyTransactionStatusBothParties } from '@/lib/shippingNotifications';

export const dynamic = 'force-dynamic';

/**
 * Demó környezet: automatikus átvétel-megerősítés.
 * A futár szimuláció után (atvetelre_var) ezt hívjuk meg ~10-15 másodperccel,
 * hogy az eladó letétben lévő összege automatikusan felszabaduljon.
 *
 * NE használd élesben — csak demo célra, mivel auth nélkül engedi a státuszváltást.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      transactionId?: string;
    };

    const { transactionId } = body;
    if (!transactionId) {
      return NextResponse.json(
        { error: 'transactionId kötelező' },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdminClient() ?? getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 500 });
    }

    const { data: transaction, error: txErr } = await supabase
      .from('transactions')
      .select(
        'id, buyer_id, seller_id, product_id, status, amount, fee, shipping_cost, payment_intent_id, checkout_session_id, wallet_pending_credited_at, wallet_released_at',
      )
      .eq('id', transactionId)
      .maybeSingle();

    if (txErr || !transaction) {
      return NextResponse.json(
        { error: 'A tranzakció nem található.' },
        { status: 404 },
      );
    }

    if (
      transaction.status === TX_STATUS.SIKERESEN_ATVEVE ||
      transaction.status === 'completed'
    ) {
      return NextResponse.json({
        ok: true,
        alreadyConfirmed: true,
        status: transaction.status,
      });
    }

    if (!canBuyerConfirmReceipt(transaction.status)) {
      return NextResponse.json(
        {
          ok: false,
          skipped: true,
          reason: `Még nem erősíthető meg (státusz: ${transaction.status}).`,
          status: transaction.status,
        },
        { status: 200 },
      );
    }

    const stripe = getStripeInstance();
    if (stripe) {
      try {
        const resolvedPi = await resolveTransactionPaymentIntentId(
          stripe,
          transaction,
          undefined,
        );
        if (resolvedPi) {
          await capturePaymentIntentSafe(stripe, resolvedPi);
          if (resolvedPi !== transaction.payment_intent_id) {
            await supabase
              .from('transactions')
              .update({ payment_intent_id: resolvedPi })
              .eq('id', transaction.id);
          }
        }
      } catch (stripeErr) {
        console.warn('[transactions.auto-confirm] Stripe capture skipped', stripeErr);
      }
    }

    const { error: updateErr } = await supabase
      .from('transactions')
      .update({
        status: TX_STATUS.SIKERESEN_ATVEVE,
        updated_at: new Date().toISOString(),
      })
      .eq('id', transaction.id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    const walletTx = {
      id: transaction.id,
      seller_id: transaction.seller_id,
      product_id: transaction.product_id,
      amount: transaction.amount,
      fee: transaction.fee,
      shipping_cost: transaction.shipping_cost,
      wallet_pending_credited_at: transaction.wallet_pending_credited_at,
      wallet_released_at: transaction.wallet_released_at,
    };

    try {
      if (!transaction.wallet_pending_credited_at) {
        await creditSellerPendingForTransaction(supabase, walletTx);
      }
      await releaseSellerWalletForTransaction(supabase, walletTx);
    } catch (walletErr) {
      console.error('[transactions.auto-confirm] wallet release failed', walletErr);
      return NextResponse.json(
        {
          error:
            walletErr instanceof Error
              ? walletErr.message
              : 'Az egyenleg frissítése sikertelen.',
        },
        { status: 500 },
      );
    }

    try {
      const { data: product } = await supabase
        .from('products')
        .select('name')
        .eq('id', transaction.product_id)
        .maybeSingle();

      await notifyTransactionStatusBothParties(
        supabase,
        {
          product_id: transaction.product_id,
          buyer_id: transaction.buyer_id,
          seller_id: transaction.seller_id,
          product: product ? { name: product.name } : null,
        },
        TX_STATUS.SIKERESEN_ATVEVE,
      );
    } catch (notifyErr) {
      console.warn('[transactions.auto-confirm] notify skipped', notifyErr);
    }

    return NextResponse.json({
      ok: true,
      status: TX_STATUS.SIKERESEN_ATVEVE,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'auto-confirm failed';
    console.error('[transactions.auto-confirm] error', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
