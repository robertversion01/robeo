import { NextRequest, NextResponse } from 'next/server';
import { getStripeInstance } from '@/lib/stripe-client';
import { getSupabaseClient } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripeInstance();
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe client unavailable' }, { status: 500 });
    }

    const supabase = getSupabaseClient() as any;
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const supabaseAdmin =
      supabaseUrl && serviceRoleKey
        ? createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
        : null;

    if (!supabase && !supabaseAdmin) {
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
      const metadataType = session.metadata?.type as string | undefined;

      if (metadataType === 'product_promotion') {
        const promotedProductId = session.metadata?.productId as string | undefined;
        const promoterId = session.metadata?.promoterId as string | undefined;
        const featuredUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        if (promotedProductId) {
          if (!promoterId) {
            console.error(
              '[stripe-webhook] missing promoterId metadata for product promotion',
              { promotedProductId, checkoutSessionId }
            );
            return NextResponse.json({ received: true });
          }

          const dbClient = (supabaseAdmin || supabase) as any;
          let updateQuery = dbClient
            .from('products')
            .update({ featured_until: featuredUntil })
            .eq('id', promotedProductId);
          updateQuery = updateQuery.eq('user_id', promoterId);

          const { error: promoteError } = await updateQuery;
          if (promoteError) {
            console.error('[stripe-webhook] failed to mark product as featured', promoteError);
          }
        }

        return NextResponse.json({ received: true });
      }

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
