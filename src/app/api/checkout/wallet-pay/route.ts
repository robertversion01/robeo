import { NextRequest, NextResponse } from 'next/server';
import { getStripeInstance } from '@/lib/stripe-client';
import { getSupabaseAdminClient } from '@/lib/supabase';
import { applyPaidTransactionEffects } from '@/lib/completePurchase';
import {
  buildTransactionInsertRow,
  buyerAddressForCheckout,
  resolveCheckout,
} from '@/lib/checkoutResolve';
import type { FoxpostTerminal } from '@/lib/foxpostTerminal';
import type { PacketaPoint } from '@/lib/packetaPoint';
import { pickupFieldsForCheckout } from '@/lib/pickupPoint';

export const dynamic = 'force-dynamic';

type Body = {
  productId?: string;
  offerId?: string;
  buyerId?: string;
  shippingMethod?: string;
  shippingCost?: number;
  bundleItemCount?: number;
  useWallet?: boolean;
  foxpostTerminal?: FoxpostTerminal | null;
  packetaPoint?: PacketaPoint | null;
  termsAccepted?: boolean;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    const {
      productId,
      offerId,
      buyerId,
      shippingMethod = '',
      shippingCost,
      bundleItemCount = 1,
      useWallet = true,
      foxpostTerminal,
      packetaPoint,
    } = body;

    if ((!productId && !offerId) || !buyerId) {
      return NextResponse.json({ error: 'Hiányzó vásárlási adatok.' }, { status: 400 });
    }

    if (shippingMethod === 'foxpost' && !foxpostTerminal?.operator_id && !foxpostTerminal?.place_id) {
      return NextResponse.json(
        { error: 'Foxpost szállításnál kötelező automata választás.' },
        { status: 400 },
      );
    }
    if (shippingMethod === 'packeta' && !packetaPoint?.id) {
      return NextResponse.json(
        { error: 'Packeta szállításnál kötelező átvételi pont választás.' },
        { status: 400 },
      );
    }

    const pickupFields = pickupFieldsForCheckout(shippingMethod, foxpostTerminal, packetaPoint);

    const db = getSupabaseAdminClient();
    if (!db) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 500 });
    }

    const resolved = await resolveCheckout(db, {
      productId,
      offerId,
      buyerId,
      shippingCost,
      bundleItemCount,
    });

    const { data: wallet } = await db
      .from('wallets')
      .select('available_balance')
      .eq('user_id', buyerId)
      .maybeSingle();

    const available = Math.max(0, Math.round(wallet?.available_balance || 0));
    const total = resolved.totalAmount;

    if (!useWallet || available <= 0) {
      return NextResponse.json({
        mode: 'stripe_only',
        walletAvailable: available,
        total,
      });
    }

    const walletToUse = Math.min(available, total);
    const remainder = total - walletToUse;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    if (remainder <= 0) {
      const { data: debited, error: debitErr } = await db.rpc('debit_wallet_available', {
        p_user_id: buyerId,
        p_amount: walletToUse,
      });

      if (debitErr || debited !== true) {
        return NextResponse.json(
          { error: 'Nem sikerült levonni az egyenlegből.' },
          { status: 400 },
        );
      }

      const insertRow = {
        ...buildTransactionInsertRow(resolved, {
          buyerId,
          shippingMethod,
          status: 'fizetve',
          paymentProvider: 'wallet',
          walletAmountPaid: walletToUse,
          foxpostTerminal: foxpostTerminal ?? null,
        }),
        ...(pickupFields || {}),
      };

      const { error: insertErr } = await db.from('transactions').insert(insertRow);
      if (insertErr) {
        return NextResponse.json({ error: insertErr.message }, { status: 500 });
      }

      const { data: buyerProfile } = await db
        .from('profiles')
        .select('location, address, address_line1, city, postal_code, email')
        .eq('id', buyerId)
        .maybeSingle();

      await applyPaidTransactionEffects(
        db,
        {
          id: resolved.transactionId,
          buyer_id: buyerId,
          seller_id: resolved.sellerId,
          product_id: resolved.productId,
          status: 'fizetve',
          amount: total,
          fee: resolved.buyerProtectionFee,
          shipping_cost: resolved.shippingCost,
        },
        null,
        {
          buyerAddressOverride: buyerAddressForCheckout(
            shippingMethod,
            foxpostTerminal ?? null,
            buyerProfile,
          ),
        },
      );

      return NextResponse.json({
        mode: 'wallet',
        successUrl: `${baseUrl}/checkout/success?transaction_id=${resolved.transactionId}`,
        transactionId: resolved.transactionId,
        walletUsed: walletToUse,
      });
    }

    const { data: debited, error: debitErr } = await db.rpc('debit_wallet_available', {
      p_user_id: buyerId,
      p_amount: walletToUse,
    });

    if (debitErr || debited !== true) {
      return NextResponse.json({ mode: 'stripe_only', walletAvailable: available, total });
    }

    const stripe = getStripeInstance();
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe unavailable' }, { status: 500 });
    }

    const checkoutSessionPayload: Record<string, unknown> = {
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'huf',
            product_data: {
              name: resolved.product.name,
              description: `Hátralék (egyenleg: ${walletToUse.toLocaleString('hu-HU')} Ft levonva)`,
              images: resolved.product.image_url ? [resolved.product.image_url] : [],
            },
            unit_amount: remainder * 100,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/products/${resolved.productId}`,
      metadata: {
        productId: resolved.productId,
        offerId: offerId || '',
        buyerId,
        sellerId: resolved.sellerId,
        transactionId: resolved.transactionId,
        type: 'escrow_payment',
        wallet_prepaid: String(walletToUse),
      },
    };

    const paymentIntentMetadata = { transactionId: resolved.transactionId };

    if (resolved.sellerStripeAccountId) {
      checkoutSessionPayload.payment_intent_data = {
        capture_method: 'manual',
        metadata: paymentIntentMetadata,
        application_fee_amount: 0,
        transfer_data: { destination: resolved.sellerStripeAccountId },
      };
    } else {
      checkoutSessionPayload.payment_intent_data = {
        capture_method: 'manual',
        metadata: paymentIntentMetadata,
      };
    }

    const session = await stripe.checkout.sessions.create(
      checkoutSessionPayload as Parameters<typeof stripe.checkout.sessions.create>[0],
    );

    const insertRow = {
      ...buildTransactionInsertRow(resolved, {
        buyerId,
        shippingMethod,
        status: 'payment_pending',
        checkoutSessionId: session.id,
        paymentIntentId: (session.payment_intent as string) || null,
        paymentProvider: 'mixed',
        walletAmountPaid: walletToUse,
        foxpostTerminal: foxpostTerminal ?? null,
      }),
      ...(pickupFields || {}),
    };

    await db.from('transactions').insert(insertRow);

    return NextResponse.json({
      mode: 'mixed',
      url: session.url,
      walletUsed: walletToUse,
      stripeAmount: remainder,
      transactionId: resolved.transactionId,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Wallet checkout failed';
    console.error('[wallet-pay]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
