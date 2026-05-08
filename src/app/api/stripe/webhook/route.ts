import { NextRequest, NextResponse } from 'next/server';
import { getStripeInstance } from '@/lib/stripe-client';
import { getSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripeInstance();
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe client unavailable' }, { status: 500 });
    }

    const supabase = getSupabaseClient() as any;
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase client unavailable' }, { status: 500 });
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const signature = req.headers.get('stripe-signature');
    if (!webhookSecret || !signature) {
      return NextResponse.json({ error: 'Webhook signature missing' }, { status: 400 });
    }

    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      const checkoutSessionId = session.id as string;

      const { data: transaction } = await supabase
        .from('transactions')
        .select('*')
        .eq('checkout_session_id', checkoutSessionId)
        .maybeSingle();

      if (transaction) {
        await supabase
          .from('transactions')
          .update({
            status: 'fizetve',
            payment_intent_id: session.payment_intent || transaction.payment_intent_id || null,
          })
          .eq('id', transaction.id);

        const { data: buyerProfile } = await supabase
          .from('profiles')
          .select('location, full_name')
          .eq('id', transaction.buyer_id)
          .maybeSingle();

        const buyerAddress = buyerProfile?.location || 'Nincs megadva';
        await supabase.from('messages').insert({
          sender_id: transaction.buyer_id,
          receiver_id: transaction.seller_id,
          content: `✅ Eladtad a terméket! Itt a vevő címe: ${buyerAddress}`,
          product_id: transaction.product_id,
          is_system_message: true,
          message_type: 'system',
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Stripe webhook error:', err);
    return NextResponse.json({ error: err.message || 'Webhook processing failed' }, { status: 400 });
  }
}
