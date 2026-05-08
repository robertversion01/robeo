import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
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
    const { productId, offerId, buyerId, shippingCost, shippingMethod } = body as {
      productId?: string;
      offerId?: string;
      buyerId?: string;
      shippingCost?: number;
      shippingMethod?: string;
    };

    console.log('[checkout] Incoming payload', {
      productId,
      offerId,
      buyerId,
      shippingCost,
      shippingMethod,
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
        console.error('[checkout] Offer not found for checkout', {
          offerId,
          buyerId,
          requestedProductId: productId,
          offerError,
        });
        return NextResponse.json(
          { error: `Offer not found (offerId: ${offerId || 'missing'})` },
          { status: 404 }
        );
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
      console.error('[checkout] Product not found after resolution', {
        resolvedProductId,
        requestedProductId: productId,
        offerId,
        productError,
      });
      return NextResponse.json(
        { error: `Product not found (productId: ${resolvedProductId})` },
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

    // Try to fetch seller from `users` first, then fallback to `profiles`.
    const sellerId = product.user_id;
    const { data: sellerDataFromUsers, error: sellerUsersError } = await supabase
      .from('users')
      .select('stripe_account_id, email')
      .eq('id', sellerId)
      .single();

    let sellerData = sellerDataFromUsers;
    let sellerError = sellerUsersError;

    if (sellerError || !sellerData) {
      const { data: sellerDataFromProfiles, error: sellerProfilesError } = await supabase
        .from('profiles')
        .select('stripe_account_id, email')
        .eq('id', sellerId)
        .single();

      sellerData = sellerDataFromProfiles;
      sellerError = sellerProfilesError;
    }

    console.log('[checkout] Seller lookup result', {
      sellerId,
      sellerError,
      sellerFound: !!sellerData,
      hasStripeAccount: !!sellerData?.stripe_account_id,
    });

    // Fallback seller data so checkout can proceed even when seller is missing.
    const fallbackStripeAccountId = process.env.FALLBACK_STRIPE_ACCOUNT_ID || '';
    const sellerStripeAccountId =
      sellerData?.stripe_account_id || fallbackStripeAccountId || null;
    const sellerEmail = sellerData?.email || 'fallback-seller@robeo.local';

    // Pre-generate transaction id so it can be attached to Stripe metadata too.
    const transactionId = randomUUID();

    // Official HU Vinted-style buyer protection fee: fixed 280 HUF + 5% of product price
    const productPrice = product.price;
    const fixedBuyerProtectionFee = 280;
    const variableBuyerProtectionFee = Math.round(productPrice * 0.05);
    const buyerProtectionFee = fixedBuyerProtectionFee + variableBuyerProtectionFee;
    const normalizedShippingCost =
      typeof shippingCost === 'number' && Number.isFinite(shippingCost) && shippingCost > 0
        ? Math.round(shippingCost)
        : 0;
    const totalAmount = productPrice + buyerProtectionFee + normalizedShippingCost;
    
    const checkoutSessionPayload: any = {
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
            unit_amount: totalAmount * 100, // Stripe uses cents
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
        sellerEmail,
        shippingMethod: shippingMethod || '',
        transactionId,
        type: 'escrow_payment',
      },
    };

    // If no seller Stripe account is available, process payment on platform account only.
    if (sellerStripeAccountId) {
      checkoutSessionPayload.payment_intent_data = {
        capture_method: 'manual',
        application_fee_amount: buyerProtectionFee * 100, // Stripe uses cents
        transfer_data: {
          destination: sellerStripeAccountId,
        },
      };
    } else {
      checkoutSessionPayload.payment_intent_data = {
        capture_method: 'manual',
      };
      console.log('[checkout] No seller Stripe account, using platform-only payment intent');
    }

    // Create a Stripe Checkout Session
    const session = await stripe.checkout.sessions.create(checkoutSessionPayload);

    // Save transaction row after Stripe session exists, so checkout_session_id is stored immediately.
    try {
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          id: transactionId,
          product_id: resolvedProductId,
          buyer_id: buyerId,
          seller_id: sellerId,
          amount: totalAmount,
          fee: buyerProtectionFee,
          shipping_method: shippingMethod || null,
          shipping_cost: normalizedShippingCost,
          status: 'payment_pending',
          checkout_session_id: session.id,
          payment_intent_id: (session.payment_intent as string) || null,
        })
        .select('id')
        .single();

      if (transactionError) {
        console.error('[checkout] Transaction creation error (non-blocking):', transactionError);
      } else {
        console.log('[checkout] Transaction saved', {
          transactionId,
          checkoutSessionId: session.id,
          paymentIntentId: session.payment_intent,
        });
      }
    } catch (transactionInsertError) {
      console.error(
        '[checkout] Transaction insert threw error (non-blocking):',
        transactionInsertError
      );
    }

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