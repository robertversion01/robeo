import { NextRequest, NextResponse } from 'next/server';
import { calculateCheckoutTotal } from '@/lib/buyerProtection';
import { getSupabaseAdminClient, getSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productId, offerId, buyerId, shippingCost, shippingMethod } = body as {
      productId?: string;
      offerId?: string;
      buyerId?: string;
      shippingCost?: number;
      shippingMethod?: string;
    };

    if ((!productId && !offerId) || !buyerId) {
      return NextResponse.json(
        { ok: false, error: 'Product ID (or Offer ID) and buyer ID are required' },
        { status: 400 },
      );
    }

    const supabase = (getSupabaseAdminClient() || getSupabaseClient()) as any;
    if (!supabase) {
      return NextResponse.json(
        { ok: false, error: 'Supabase configuration is missing' },
        { status: 500 },
      );
    }

    let resolvedProductId = productId || null;
    let productPrice: number | null = null;

    if (offerId) {
      const { data: offerData, error: offerError } = await supabase
        .from('offers')
        .select('id, product_id, buyer_id, offered_price, status')
        .eq('id', offerId)
        .single();

      if (offerError || !offerData) {
        return NextResponse.json(
          { ok: false, error: `Offer not found (offerId: ${offerId})` },
          { status: 404 },
        );
      }

      if (offerData.buyer_id && offerData.buyer_id !== buyerId) {
        return NextResponse.json(
          { ok: false, error: 'Offer does not belong to this buyer' },
          { status: 403 },
        );
      }

      const offerStatus = (offerData as { status?: string }).status;
      if (offerStatus !== 'accepted') {
        return NextResponse.json(
          {
            ok: false,
            error:
              'Csak elfogadott ajánlattal lehet fizetni. Az eladónak el kell fogadnia az ajánlatot (vagy az ellenajánlatot).',
          },
          { status: 400 },
        );
      }

      const op = (offerData as { offered_price?: number }).offered_price;
      if (typeof op !== 'number' || !Number.isFinite(op) || op < 1) {
        return NextResponse.json({ ok: false, error: 'Érvénytelen ajánlati ár.' }, { status: 400 });
      }
      productPrice = Math.round(op);

      if (offerData.product_id) {
        resolvedProductId = offerData.product_id;
      }
    }

    if (!resolvedProductId) {
      return NextResponse.json(
        { ok: false, error: 'Unable to resolve product ID for checkout' },
        { status: 400 },
      );
    }

    const { data: productData, error: productError } = await supabase
      .from('products')
      .select('id, user_id, name, price, status')
      .eq('id', resolvedProductId)
      .single();

    if (productError || !productData) {
      return NextResponse.json(
        { ok: false, error: `Product not found (productId: ${resolvedProductId})` },
        { status: 404 },
      );
    }

    if (productData.user_id === buyerId) {
      return NextResponse.json(
        { ok: false, error: 'A saját termékedet nem vásárolhatod meg.' },
        { status: 400 },
      );
    }

    if (productPrice === null) {
      productPrice = Math.round(productData.price);
    }

    const normalizedShippingCost =
      typeof shippingCost === 'number' && Number.isFinite(shippingCost) && shippingCost > 0
        ? Math.round(shippingCost)
        : 0;

    const pricing = calculateCheckoutTotal(productPrice, normalizedShippingCost);

    return NextResponse.json({
      ok: true,
      message: 'Checkout azonosítók és árazás rendben.',
      pricing: {
        productPriceHuf: productPrice,
        buyerProtectionFeeHuf: pricing.buyerProtectionFee,
        shippingCostHuf: pricing.shippingCost,
        totalHuf: pricing.total,
      },
      debug: {
        buyerId,
        requestedProductId: productId || null,
        offerId: offerId || null,
        resolvedProductId,
        shippingMethod: shippingMethod || null,
      },
      product: {
        id: productData.id,
        name: productData.name,
        price: productPrice,
        listPrice: productData.price,
        status: productData.status,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected validation error';
    console.error('[checkout-validate] error', error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
