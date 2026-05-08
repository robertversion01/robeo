import { NextRequest, NextResponse } from 'next/server';
import { getStripeInstance } from '@/lib/stripe-client';
import { getSupabaseClient } from '@/lib/supabase';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Get Stripe instance using the singleton pattern
    const stripe = getStripeInstance();

    if (!stripe) {
      return NextResponse.json(
        {
          error: 'Stripe configuration is missing',
        },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { productId, offerId, buyerId } = body as {
      productId?: string;
      offerId?: string;
      buyerId?: string;
    };

    console.log('[checkout] Incoming payload', {
      productId,
      offerId,
      buyerId,
    });

    if ((!productId && !offerId) || !buyerId) {
      return NextResponse.json(
        {
          error: 'Product ID (or Offer ID) and buyer ID are required',
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient() as any;

    if (!supabase) {
      console.error('Supabase configuration is missing');
      return NextResponse.json(
        {
          error: 'Supabase configuration is missing',
        },
        {
          status: 500,
        }
      );
    }

    let resolvedProductId = productId;

    // If we have an offer ID, resolve the related product first.
    if (offerId) {
      const { data: offerData, error: offerError } = await supabase
        .from('offers')
        .select('id, product_id, buyer_id')
        .eq('id', offerId)
        .single();

      console.log('[checkout] Offer lookup result', {
        offerId,
        offerError,
        offerProductId: offerData?.product_id,
        offerBuyerId: offerData?.buyer_id,
      });

      if (offerError || !offerData) {
        return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
      }

      if (offerData.buyer_id && buyerId && offerData.buyer_id !== buyerId) {
        return NextResponse.json(
          { error: 'Offer does not belong to this buyer' },
          { status: 403 }
        );
      }

      if (offerData.product_id) {
        resolvedProductId = offerData.product_id;
      }
    }

    // Safety fallback: sometimes productId may actually contain an offer ID.
    if (!resolvedProductId && productId) {
      const { data: fallbackOfferData, error: fallbackOfferError } = await supabase
        .from('offers')
        .select('id, product_id')
        .eq('id', productId)
        .single();

      console.log('[checkout] Fallback offer lookup by productId', {
        productId,
        fallbackOfferError,
        fallbackOfferProductId: fallbackOfferData?.product_id,
      });

      if (!fallbackOfferError && fallbackOfferData?.product_id) {
        resolvedProductId = fallbackOfferData.product_id;
      }
    }

    if (!resolvedProductId) {
      return NextResponse.json(
        { error: 'Unable to resolve product ID for checkout' },
        { status: 400 }
      );
    }

    console.log('[checkout] Resolved product ID', {
      requestedProductId: productId,
      offerId,
      resolvedProductId,
    });

    // Fetch product details without relational join to avoid FK inference issues
    const { data: productData, error: productError } = await supabase
      .from('products')
      .select('id, user_id, name, description, image_url, price')
      .eq('id', resolvedProductId)
      .single();

    console.log('[checkout] Product lookup result', {
      resolvedProductId,
      productError,
      productFound: !!productData,
    });

    if (productError || !productData) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    const product = productData as {
      id: string;
      user_id: string;
      name: string;
      description?: string | null;
      image_url?: string | null;
      price: number;
    };

    // Check if the seller has a Stripe account
    const sellerId = product.user_id;
    const { data: sellerData, error: sellerError } = await supabase
      .from('users')
      .select('stripe_account_id, email')
      .eq('id', sellerId)
      .single();

    console.log('[checkout] Seller lookup result', {
      sellerId,
      sellerError,
      sellerFound: !!sellerData,
      hasStripeAccount: !!sellerData?.stripe_account_id,
    });

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
        product_id: resolvedProductId,
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
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/products/${resolvedProductId}`,
      metadata: {
        productId: resolvedProductId,
        offerId: offerId || '',
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