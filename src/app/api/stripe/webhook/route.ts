import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseClient } from '@/lib/supabase';

// Stabil verzió beállítása
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-01-27.acacia' as any,
});

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Csak futásidőben ellenőrizzük a kulcsot, hogy a build ne álljon le
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe kulcs hiányzik' }, { status: 500 });
    }

    const { productId, price, title } = await req.json();
    const supabase = getSupabaseClient();
    
    if (!supabase) {
      return NextResponse.json({ error: 'Adatbázis hiba' }, { status: 500 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Bejelentkezés szükséges' }, { status: 401 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'huf',
          product_data: { name: title },
          unit_amount: Math.round(price),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/products/${productId}`,
      metadata: { productId, buyerId: user.id },
    });

    return NextResponse.json({ id: session.id });
  } catch (err: any) {
    console.error('Stripe hiba:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
