import { NextRequest, NextResponse } from 'next/server';
import { getStripeInstance } from '@/lib/stripe-client';
import { getSupabaseAdminClient, getSupabaseClient } from '@/lib/supabase';
import { canBuyerConfirmReceipt } from '@/lib/transactionFlow';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { transactionId?: string; buyerId?: string };
    const { transactionId, buyerId } = body;

    if (!transactionId) {
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });
    }

    const stripe = getStripeInstance();
    const supabase = (getSupabaseAdminClient() || getSupabaseClient()) as ReturnType<
      typeof getSupabaseAdminClient
    >;
    if (!stripe || !supabase) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 500 });
    }

    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .select('id, buyer_id, seller_id, payment_intent_id, status, product_id')
      .eq('id', transactionId)
      .single();

    if (transactionError || !transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    if (buyerId && transaction.buyer_id !== buyerId) {
      return NextResponse.json({ error: 'Only the buyer can confirm receipt' }, { status: 403 });
    }

    if (!canBuyerConfirmReceipt(transaction.status)) {
      return NextResponse.json(
        {
          error:
            'A tranzakció még nem erősíthető meg. Várj, amíg a csomag átvételre vár állapotba kerül.',
        },
        { status: 400 },
      );
    }

    if (!transaction.payment_intent_id) {
      return NextResponse.json({ error: 'Payment intent is missing' }, { status: 400 });
    }

    await stripe.paymentIntents.capture(transaction.payment_intent_id);

    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        status: 'sikeresen_atveve',
        updated_at: new Date().toISOString(),
      })
      .eq('id', transaction.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to confirm transaction';
    console.error('[transactions.confirm] error', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
