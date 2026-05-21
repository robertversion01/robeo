import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getStripeInstance } from '@/lib/stripe-client';
import { isConnectAccountReady } from '@/lib/stripeConnect';
import { getSupabaseAdminClient, getSupabaseClient } from '@/lib/supabase';
import { insertWalletLedgerEntry } from '@/lib/walletLedger';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripeInstance();
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe configuration is missing' }, { status: 500 });
    }

    const body = await req.json();
    const { userId } = body as { userId?: string };

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const db = getSupabaseAdminClient();
    if (!db) {
      return NextResponse.json(
        { error: 'Server database (service role) is required for payouts' },
        { status: 500 },
      );
    }

    const { data: profileRaw } = await db
      .from('profiles')
      .select(
        'connected_account_id, stripe_account_id, stripe_connect_onboarded, email',
      )
      .eq('id', userId)
      .maybeSingle();

    const profile = profileRaw as {
      connected_account_id?: string | null;
      stripe_account_id?: string | null;
      stripe_connect_onboarded?: boolean | null;
    } | null;

    const accountId =
      profile?.connected_account_id || profile?.stripe_account_id || null;

    if (!accountId) {
      return NextResponse.json(
        { error: 'connect_required', message: 'Előbb csatlakoztasd a bankszámládat.' },
        { status: 400 },
      );
    }

    const account = await stripe.accounts.retrieve(accountId);
    const ready = isConnectAccountReady(account);

    if (!ready) {
      return NextResponse.json(
        {
          error: 'connect_incomplete',
          message: 'A Stripe onboarding még nincs befejezve.',
        },
        { status: 400 },
      );
    }

    const { data: wallet, error: walletErr } = await db
      .from('wallets')
      .select('available_balance, currency')
      .eq('user_id', userId)
      .maybeSingle();

    if (walletErr) {
      return NextResponse.json({ error: walletErr.message }, { status: 500 });
    }

    const amount = Math.round(wallet?.available_balance || 0);
    if (amount < 1) {
      return NextResponse.json(
        { error: 'insufficient_balance', message: 'Nincs kifizethető egyenleg.' },
        { status: 400 },
      );
    }

    const currency = (wallet?.currency || 'huf').toLowerCase();

    const payoutId = randomUUID();
    await db.from('wallet_payouts').insert({
      id: payoutId,
      user_id: userId,
      amount,
      status: 'pending',
    });

    const transfer = await stripe.transfers.create({
      amount,
      currency,
      destination: accountId,
      description: `Robeo wallet kifizetés — ${userId}`,
      metadata: {
        robeo_user_id: userId,
        robeo_payout_id: payoutId,
      },
    });

    const { error: debitErr } = await db.rpc('debit_wallet_available', {
      p_user_id: userId,
      p_amount: amount,
    });

    if (debitErr) {
      console.error('[stripe-connect/cashout] wallet debit failed after transfer', debitErr);
      return NextResponse.json(
        {
          error: 'wallet_debit_failed',
          message:
            'A Stripe átutalás megtörtént, de a belső egyenleg frissítése sikertelen — lépj kapcsolatba az ügyfélszolgálattal.',
          transferId: transfer.id,
        },
        { status: 500 },
      );
    }

    await db
      .from('wallet_payouts')
      .update({
        stripe_transfer_id: transfer.id,
        status: 'completed',
      })
      .eq('id', payoutId);

    await insertWalletLedgerEntry(db, {
      userId,
      entryType: 'cashout',
      amountHuf: amount,
      status: 'completed',
      description: 'Kifizetés bankszámlára (Stripe)',
      meta: { stripeTransferId: transfer.id, payoutId },
    });

    await db
      .from('profiles')
      .update({
        stripe_connect_onboarded: true,
        stripe_connect_details_submitted: Boolean(account.details_submitted),
        connected_account_id: accountId,
        stripe_account_id: accountId,
      })
      .eq('id', userId);

    return NextResponse.json({
      ok: true,
      transferId: transfer.id,
      amountHuf: amount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Cashout failed';
    console.error('[stripe-connect/cashout]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
