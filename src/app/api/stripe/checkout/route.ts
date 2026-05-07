import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';
import { getStripeInstance } from '@/lib/stripe-client';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Get Stripe instance using the singleton pattern
    const stripe = getStripeInstance();
    
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe configuration is missing' },
        { status: 500 }
      );
    }
    const { productId, buyerId } = await req.json();

    if (!productId || !buyerId) {
      return NextResponse.json(
        { error: 'Product ID and buyer ID are required' },
        { status: 400 }
      );
    }

    // Fetch product details from Supabase
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*, user:user_id(*)')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Check if the seller has a Stripe account
    const sellerId = product.user_id;
    const { data: sellerData, error: sellerError } = await supabase
      .from('users')
      .select('stripe_account_id, email')
      .eq('id', sellerId)
      .single();

    if (sellerError || !sellerData) {
      return NextResponse.json(
        { error: 'Seller information not found' },
        { status: 404 }
      );
    }

    // Create a transaction record in pending state
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        product_id: productId,
        buyer_id: buyerId,
        seller_id: sellerId,
        amount: product.price,
        status: 'payment_pending',
        payment_intent_id: null, // Will be updated after Stripe session creation
      })
      .select()
      .single();

    if (transactionError) {
      console.error('Transaction creation error:', transactionError);
      return NextResponse.json(
        { error: 'Failed to create transaction' },
        { status: 500 }
      );
    }

    // Calculate the platform fee (10% of the product price)
    const productPrice = product.price;
    const platformFeePercentage = 0.10;
    const platformFee = Math.round(productPrice * platformFeePercentage);
    
    // Calculate the amount that will go to the seller (90% of the product price)
    const sellerAmount = productPrice - platformFee;

    // Create a Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'huf',
            product_data: {
              name: product.name,
              description: product.description?.substring(0, 255) || 'No description',
              images: product.image_url ? [product.image_url] : [],
            },
            unit_amount: product.price * 100, // Stripe uses cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/products/${productId}`,
      metadata: {
        productId,
        buyerId,
        sellerId,
        transactionId: transaction.id,
        type: 'escrow_payment',
      },
      payment_intent_data: {
        // This ensures the money is held by the platform until the order is fulfilled
        capture_method: 'manual',
        application_fee_amount: platformFee * 100, // Stripe uses cents
        transfer_data: {
          destination: sellerData.stripe_account_id,
        },
      },
    });

    // Update the transaction with the payment intent ID
    await supabase
      .from('transactions')
      .update({
        payment_intent_id: session.payment_intent as string,
      })
      .eq('id', transaction.id);

    // Return the session URL
    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred during checkout' },
      { status: 500 }
    );
  }
}