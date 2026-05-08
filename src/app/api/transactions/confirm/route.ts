import { NextRequest, NextResponse } from 'next/server';
import { getStripeInstance } from '@/lib/stripe-client';
import { getSupabaseAdminClient, getSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { transactionId } = (await req.json()) as { transactionId?: string };
    if (!transactionId) {
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });
    }

    const stripe = getStripeInstance();
    const supabase = (getSupabaseAdminClient() || getSupabaseClient()) as any;
    if (!stripe || !supabase) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 500 });
    }

    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .select('id, payment_intent_id, status')
      .eq('id', transactionId)
      .single();

    if (transactionError || !transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    if (!transaction.payment_intent_id) {
      return NextResponse.json({ error: 'Payment intent is missing' }, { status: 400 });
    }

    await stripe.paymentIntents.capture(transaction.payment_intent_id);

    await supabase
      .from('transactions')
      .update({ status: 'sikeresen_atveve' })
      .eq('id', transaction.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[transactions.confirm] error', error);
    return NextResponse.json({ error: error.message || 'Failed to confirm transaction' }, { status: 500 });
  }
}
