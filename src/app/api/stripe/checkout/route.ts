import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { calculateCheckoutTotal } from '@/lib/buyerProtection';
import { applyBundleDiscountToPrice } from '@/lib/bundleDiscount';
import { getStripeInstance } from '@/lib/stripe-client';
import { getSupabaseAdminClient, getSupabaseClient } from '@/lib/supabase';
import { insertTransactionLineItems } from '@/lib/bundleLineItems';
import {
  type FoxpostTerminal,
} from '@/lib/foxpostTerminal';
import type { PacketaPoint } from '@/lib/packetaPoint';
import { pickupFieldsForCheckout } from '@/lib/pickupPoint';
import { appBaseUrl } from '@/lib/stripeConnect';
import { isListedProduct } from '@/lib/listedProducts';

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
    const {
      productId,
      productIds,
      offerId,
      buyerId,
      shippingCost,
      shippingMethod,
      bundleDiscountPercent,
      foxpostTerminal,
      packetaPoint,
      termsAccepted,
    } = body as {
      productId?: string;
      productIds?: string[];
      offerId?: string;
      buyerId?: string;
      shippingCost?: number;
      shippingMethod?: string;
      bundleDiscountPercent?: number;
      foxpostTerminal?: FoxpostTerminal | null;
      packetaPoint?: PacketaPoint | null;
      termsAccepted?: boolean;
    };

    if (termsAccepted !== true) {
      return NextResponse.json(
        { error: 'A vásárlási feltételek elfogadása kötelező a fizetéshez.' },
        { status: 400 },
      );
    }

    const bundleIds = Array.isArray(productIds)
      ? productIds.map(String).filter(Boolean)
      : [];
    const isBundleCheckout = bundleIds.length >= 2 && !offerId;

    console.log('[checkout] Incoming payload', {
      productId,
      productIds: bundleIds,
      offerId,
      buyerId,
      shippingCost,
      shippingMethod,
      isBundleCheckout,
    });

    if ((!productId && !offerId && bundleIds.length < 2) || !buyerId) {
      return NextResponse.json(
        {
          error: 'Product ID (or Offer ID, or 2+ productIds) and buyer ID are required',
        },
        { status: 400 }
      );
    }

    const supabase = (getSupabaseAdminClient() || getSupabaseClient()) as any;

    if (isBundleCheckout) {
      return handleBundleCheckout({
        stripe,
        supabase,
        bundleIds,
        buyerId,
        shippingCost,
        shippingMethod,
        bundleDiscountPercent,
        foxpostTerminal: foxpostTerminal ?? null,
        packetaPoint: packetaPoint ?? null,
      });
    }

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
    /** Ajánlati ár — csak elfogadott ajánlatnál */
    let negotiatedPrice: number | null = null;

    // If we have an offer ID, resolve the related product first.
    if (offerId) {
      const { data: offerData, error: offerError } = await supabase
        .from('offers')
        .select('id, product_id, buyer_id, offered_price, status')
        .eq('id', offerId)
        .single();

      console.log('[checkout] Offer lookup result', {
        offerId,
        offerError,
        offerProductId: offerData?.product_id,
        offerBuyerId: offerData?.buyer_id,
        status: (offerData as { status?: string })?.status,
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

      const offerStatus = (offerData as { status?: string }).status;
      if (offerStatus !== 'accepted') {
        return NextResponse.json(
          {
            error:
              'Csak elfogadott ajánlattal lehet fizetni. Az eladónak el kell fogadnia az ajánlatot (vagy az ellenajánlatot).',
          },
          { status: 400 }
        );
      }

      const op = (offerData as { offered_price?: number }).offered_price;
      if (typeof op !== 'number' || !Number.isFinite(op) || op < 1) {
        return NextResponse.json({ error: 'Érvénytelen ajánlati ár.' }, { status: 400 });
      }
      negotiatedPrice = Math.round(op);

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
      .select('id, user_id, name, description, image_url, price, status')
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
      status?: string | null;
    };

    if (!isListedProduct(product.status)) {
      return NextResponse.json(
        { error: 'Ez a termék már nem elérhető vásárlásra.' },
        { status: 400 },
      );
    }

    // Try to fetch seller from `users` first, then fallback to `profiles`.
    const sellerId = product.user_id;

    if (sellerId === buyerId) {
      return NextResponse.json(
        { error: 'A saját termékedet nem vásárolhatod meg.' },
        { status: 400 },
      );
    }

    if (shippingMethod === 'foxpost' && !foxpostTerminal) {
      return NextResponse.json(
        { error: 'Foxpost szállításnál kötelező automata választás.' },
        { status: 400 },
      );
    }
    if (shippingMethod === 'packeta' && !packetaPoint) {
      return NextResponse.json(
        { error: 'Packeta szállításnál kötelező átvételi pont választás.' },
        { status: 400 },
      );
    }

    const pickupFields = pickupFieldsForCheckout(shippingMethod, foxpostTerminal, packetaPoint);
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

    const productPrice =
      negotiatedPrice !== null ? negotiatedPrice : Math.round(product.price);
    const normalizedShippingCost =
      typeof shippingCost === 'number' && Number.isFinite(shippingCost) && shippingCost > 0
        ? Math.round(shippingCost)
        : 0;
    const { buyerProtectionFee, total: totalAmount } = calculateCheckoutTotal(
      productPrice,
      normalizedShippingCost,
    );
    
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
      success_url: `${appBaseUrl()}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appBaseUrl()}/products/${resolvedProductId}`,
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
          ...(pickupFields || {}),
        })
        .select('id')
        .single();

      if (transactionError && pickupFields && /foxpost_terminal|pickup_point|pickup_provider/i.test(transactionError.message)) {
        const baseRow = {
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
        };
        await supabase.from('transactions').insert(baseRow);
      } else if (transactionError) {
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

async function handleBundleCheckout(ctx: {
  stripe: NonNullable<ReturnType<typeof getStripeInstance>>;
  supabase: any;
  bundleIds: string[];
  buyerId: string;
  shippingCost?: number;
  shippingMethod?: string;
  bundleDiscountPercent?: number;
  foxpostTerminal?: FoxpostTerminal | null;
  packetaPoint?: PacketaPoint | null;
}) {
  const {
    stripe,
    supabase,
    bundleIds,
    buyerId,
    shippingCost,
    shippingMethod,
    bundleDiscountPercent,
    foxpostTerminal,
    packetaPoint,
  } = ctx;

  if (shippingMethod === 'foxpost' && !foxpostTerminal) {
    return NextResponse.json(
      { error: 'Foxpost szállításnál kötelező automata választás.' },
      { status: 400 },
    );
  }
  if (shippingMethod === 'packeta' && !packetaPoint) {
    return NextResponse.json(
      { error: 'Packeta szállításnál kötelező átvételi pont választás.' },
      { status: 400 },
    );
  }

  const pickupFields = pickupFieldsForCheckout(shippingMethod, foxpostTerminal, packetaPoint);

  const uniqueIds = [...new Set(bundleIds)].slice(0, 8);
  const { data: productsData, error: productsError } = await supabase
    .from('products')
    .select('id, user_id, name, description, image_url, price, status')
    .in('id', uniqueIds);

  if (productsError || !productsData || productsData.length !== uniqueIds.length) {
    return NextResponse.json({ error: 'Egy vagy több termék nem található.' }, { status: 404 });
  }

  const products = productsData as Array<{
    id: string;
    user_id: string;
    name: string;
    description?: string | null;
    image_url?: string | null;
    price: number;
    status?: string | null;
  }>;

  const unavailable = products.find((p) => !isListedProduct(p.status));
  if (unavailable) {
    return NextResponse.json(
      { error: 'A csomag egy vagy több terméke már nem elérhető vásárlásra.' },
      { status: 400 },
    );
  }

  const sellerIds = new Set(products.map((p) => p.user_id));
  if (sellerIds.size !== 1) {
    return NextResponse.json(
      { error: 'Csomag vásárlásnál minden terméknek ugyanattól az eladótól kell származnia.' },
      { status: 400 },
    );
  }

  const sellerId = products[0].user_id;
  if (sellerId === buyerId) {
    return NextResponse.json({ error: 'A saját termékedet nem vásárolhatod meg.' }, { status: 400 });
  }

  const subtotal = products.reduce((sum, p) => sum + Math.round(p.price), 0);
  const pct = Math.min(50, Math.max(0, Math.round(bundleDiscountPercent || 0)));
  const productPrice = applyBundleDiscountToPrice(subtotal, pct);
  const normalizedShippingCost =
    typeof shippingCost === 'number' && Number.isFinite(shippingCost) && shippingCost > 0
      ? Math.round(shippingCost)
      : 0;
  const { buyerProtectionFee, total: totalAmount } = calculateCheckoutTotal(
    productPrice,
    normalizedShippingCost,
  );

  const { data: sellerDataFromUsers } = await supabase
    .from('users')
    .select('stripe_account_id, email')
    .eq('id', sellerId)
    .single();

  let sellerData = sellerDataFromUsers;
  if (!sellerData) {
    const { data: sellerDataFromProfiles } = await supabase
      .from('profiles')
      .select('stripe_account_id, email')
      .eq('id', sellerId)
      .single();
    sellerData = sellerDataFromProfiles;
  }

  const fallbackStripeAccountId = process.env.FALLBACK_STRIPE_ACCOUNT_ID || '';
  const sellerStripeAccountId =
    sellerData?.stripe_account_id || fallbackStripeAccountId || null;
  const sellerEmail = sellerData?.email || 'fallback-seller@robeo.local';
  const transactionId = randomUUID();
  const primaryProductId = products[0].id;
  const bundleLabel = `ROBEO csomag (${products.length} termék)`;

  const checkoutSessionPayload: any = {
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'huf',
          product_data: {
            name: bundleLabel,
            description: products.map((p) => p.name).join(', ').substring(0, 255),
            images: products[0].image_url ? [products[0].image_url] : [],
          },
          unit_amount: totalAmount * 100,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${appBaseUrl()}/checkout/success?session_id={CHECKOUT_SESSION_ID}&bundle=1`,
    cancel_url: `${appBaseUrl()}/checkout?bundle=1`,
    metadata: {
      productId: primaryProductId,
      productIds: uniqueIds.join(','),
      bundle: 'true',
      bundleDiscountPercent: String(pct),
      offerId: '',
      buyerId,
      sellerId,
      sellerEmail,
      shippingMethod: shippingMethod || '',
      transactionId,
      type: 'escrow_payment',
    },
  };

  if (sellerStripeAccountId) {
    checkoutSessionPayload.payment_intent_data = {
      capture_method: 'manual',
      application_fee_amount: buyerProtectionFee * 100,
      transfer_data: { destination: sellerStripeAccountId },
      metadata: {
        productIds: uniqueIds.join(','),
        bundle: 'true',
        transactionId,
      },
    };
  } else {
    checkoutSessionPayload.payment_intent_data = {
      capture_method: 'manual',
      metadata: {
        productIds: uniqueIds.join(','),
        bundle: 'true',
        transactionId,
      },
    };
  }

  const session = await stripe.checkout.sessions.create(checkoutSessionPayload);

  try {
    const pickupDbFields = pickupFields || {};
    const baseRow = {
      id: transactionId,
      product_id: primaryProductId,
      buyer_id: buyerId,
      seller_id: sellerId,
      amount: totalAmount,
      fee: buyerProtectionFee,
      shipping_method: shippingMethod || null,
      shipping_cost: normalizedShippingCost,
      status: 'payment_pending',
      checkout_session_id: session.id,
      payment_intent_id: (session.payment_intent as string) || null,
      ...pickupDbFields,
    };
    const bundleRow: Record<string, unknown> = {
      ...baseRow,
      bundle_item_count: products.length,
      bundle_product_ids: uniqueIds.join(','),
    };
    const { error: fullErr } = await supabase.from('transactions').insert(bundleRow);
    if (fullErr && /bundle_product_ids|bundle_item_count|foxpost_terminal|pickup_point|pickup_provider/i.test(fullErr.message)) {
      const {
        pickup_point_id: _ppi,
        pickup_point_name: _ppn,
        pickup_point_address: _ppa,
        pickup_provider: _ppr,
        foxpost_terminal_id: _id,
        foxpost_terminal_name: _name,
        foxpost_terminal_address: _addr,
        ...withoutPickup
      } = bundleRow as Record<string, unknown>;
      const { error: bundleOnlyErr } = await supabase.from('transactions').insert({
        ...withoutPickup,
        bundle_item_count: products.length,
        bundle_product_ids: uniqueIds.join(','),
      });
      if (bundleOnlyErr) {
        await supabase.from('transactions').insert(baseRow);
      }
    }

    await insertTransactionLineItems(
      supabase,
      transactionId,
      products.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        image_url: p.image_url ?? null,
      })),
    );
  } catch {
    /* non-blocking */
  }

  return NextResponse.json({ url: session.url, bundle: true, itemCount: products.length });
}