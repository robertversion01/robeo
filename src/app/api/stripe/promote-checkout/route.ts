import { NextRequest, NextResponse } from 'next/server';
import { getStripeInstance } from '@/lib/stripe-client';
import { getSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const PROMOTION_FEE_HUF = 690;

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripeInstance();
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe configuration is missing' }, { status: 500 });
    }

    const supabase = getSupabaseClient() as any;
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase configuration is missing' }, { status: 500 });
    }

    const body = (await req.json()) as { productId?: string; userId?: string };
    const { productId, userId } = body;

    if (!productId || !userId) {
      return NextResponse.json({ error: 'Product ID and user ID are required' }, { status: 400 });
    }

    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, user_id, name, featured_until')
      .eq('id', productId)
      .single();

    if (productError?.code === '42703') {
      return NextResponse.json(
        { error: 'A products.featured_until oszlop hianyzik. Futtasd le a legfrissebb migration.sql-t.' },
        { status: 500 }
      );
    }

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    if (product.user_id !== userId) {
      return NextResponse.json({ error: 'You can only promote your own product' }, { status: 403 });
    }

    const isCurrentlyFeatured =
      typeof product.featured_until === 'string' &&
      new Date(product.featured_until).getTime() > Date.now();

    if (isCurrentlyFeatured) {
      return NextResponse.json({ error: 'Product is already featured' }, { status: 409 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'huf',
            product_data: {
              name: product.name || 'Hirdetés',
              description: 'Főoldali kiemelés (7 nap)',
            },
            // Stripe account-level currency behavior can vary; this keeps displayed amount at 690 HUF.
            unit_amount: PROMOTION_FEE_HUF * 100,
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/profile?promote=success`,
      cancel_url: `${baseUrl}/profile?promote=cancelled`,
      metadata: {
        type: 'product_promotion',
        productId,
        promoterId: userId,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('[promote-checkout] error', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create promotion checkout' },
      { status: 500 }
    );
  }
}
