import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productId, offerId, buyerId } = body as {
      productId?: string;
      offerId?: string;
      buyerId?: string;
    };

    if ((!productId && !offerId) || !buyerId) {
      return NextResponse.json(
        { ok: false, error: 'Product ID (or Offer ID) and buyer ID are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient() as any;
    if (!supabase) {
      return NextResponse.json(
        { ok: false, error: 'Supabase configuration is missing' },
        { status: 500 }
      );
    }

    let resolvedProductId = productId || null;

    if (offerId) {
      const { data: offerData, error: offerError } = await supabase
        .from('offers')
        .select('id, product_id, buyer_id')
        .eq('id', offerId)
        .single();

      if (offerError || !offerData) {
        return NextResponse.json(
          { ok: false, error: `Offer not found (offerId: ${offerId})` },
          { status: 404 }
        );
      }

      if (offerData.buyer_id && offerData.buyer_id !== buyerId) {
        return NextResponse.json(
          { ok: false, error: 'Offer does not belong to this buyer' },
          { status: 403 }
        );
      }

      if (offerData.product_id) {
        resolvedProductId = offerData.product_id;
      }
    }

    if (!resolvedProductId) {
      return NextResponse.json(
        { ok: false, error: 'Unable to resolve product ID for checkout' },
        { status: 400 }
      );
    }

    const { data: productData, error: productError } = await supabase
      .from('products')
      .select('id, user_id, name, price')
      .eq('id', resolvedProductId)
      .single();

    if (productError || !productData) {
      return NextResponse.json(
        { ok: false, error: `Product not found (productId: ${resolvedProductId})` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: 'Checkout azonosítók rendben vannak.',
      debug: {
        buyerId,
        requestedProductId: productId || null,
        offerId: offerId || null,
        resolvedProductId,
      },
      product: {
        id: productData.id,
        name: productData.name,
        price: productData.price,
      },
    });
  } catch (error: any) {
    console.error('[checkout-validate] error', error);
    return NextResponse.json(
      { ok: false, error: error?.message || 'Unexpected validation error' },
      { status: 500 }
    );
  }
}
