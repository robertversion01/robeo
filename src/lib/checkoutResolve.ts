import type { SupabaseClient } from '@supabase/supabase-js';
import { calculateCheckoutTotal } from '@/lib/buyerProtection';
import {
  applyBundleDiscountToPrice,
  bundleDiscountPercentForCount,
  fetchSellerBundleDiscountSettings,
} from '@/lib/bundleDiscount';
import { foxpostTerminalAddress, type FoxpostTerminal } from '@/lib/foxpostTerminal';
import { isListedProduct } from '@/lib/listedProducts';
import { pickupFieldsFromFoxpost } from '@/lib/pickupPoint';

export type CheckoutBundleProduct = {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  price: number;
};

export type CheckoutBundleResolved = {
  transactionId: string;
  primaryProductId: string;
  products: CheckoutBundleProduct[];
  productIds: string[];
  sellerId: string;
  sellerEmail: string;
  sellerStripeAccountId: string | null;
  subtotal: number;
  bundleDiscountPercent: number;
  productPrice: number;
  buyerProtectionFee: number;
  shippingCost: number;
  totalAmount: number;
};

export type CheckoutResolveInput = {
  productId?: string;
  offerId?: string;
  buyerId: string;
  shippingCost?: number;
  bundleItemCount?: number;
};

export type CheckoutResolved = {
  transactionId: string;
  productId: string;
  product: {
    id: string;
    user_id: string;
    name: string;
    description?: string | null;
    image_url?: string | null;
    price: number;
  };
  sellerId: string;
  sellerEmail: string;
  sellerStripeAccountId: string | null;
  productPrice: number;
  bundleItemCount: number;
  bundleDiscountPercent: number;
  buyerProtectionFee: number;
  shippingCost: number;
  totalAmount: number;
  negotiatedPrice: number | null;
  offerId?: string;
};

export async function resolveCheckout(
  supabase: SupabaseClient,
  input: CheckoutResolveInput,
): Promise<CheckoutResolved> {
  const { randomUUID } = await import('crypto');
  const transactionId = randomUUID();

  let resolvedProductId = input.productId;
  let negotiatedPrice: number | null = null;
  let offerId = input.offerId;

  if (offerId) {
    const { data: offerData, error: offerError } = await supabase
      .from('offers')
      .select('id, product_id, buyer_id, offered_price, status')
      .eq('id', offerId)
      .single();

    if (offerError || !offerData) {
      throw new Error(`Offer not found (offerId: ${offerId})`);
    }
    if (offerData.buyer_id && offerData.buyer_id !== input.buyerId) {
      throw new Error('Offer does not belong to this buyer');
    }
    if (offerData.status !== 'accepted') {
      throw new Error('Csak elfogadott ajánlattal lehet fizetni.');
    }
    negotiatedPrice = Math.round(Number(offerData.offered_price) || 0);
    resolvedProductId = offerData.product_id;
  }

  if (!resolvedProductId) {
    throw new Error('Unable to resolve product ID for checkout');
  }

  const { data: productData, error: productError } = await supabase
    .from('products')
    .select('id, user_id, name, description, image_url, price, status')
    .eq('id', resolvedProductId)
    .single();

  if (productError || !productData) {
    throw new Error(`Product not found (${resolvedProductId})`);
  }

  if (!isListedProduct(productData.status)) {
    throw new Error('Ez a termék már nem elérhető vásárlásra.');
  }

  const sellerId = productData.user_id;
  if (sellerId === input.buyerId) {
    throw new Error('A saját termékedet nem vásárolhatod meg.');
  }

  const [{ data: sellerProfile }, sellerBundle] = await Promise.all([
    supabase.from('profiles').select('email, stripe_account_id').eq('id', sellerId).maybeSingle(),
    fetchSellerBundleDiscountSettings(supabase, sellerId),
  ]);

  const { data: sellerUser } = await supabase
    .from('users')
    .select('stripe_account_id, email')
    .eq('id', sellerId)
    .maybeSingle();

  const sellerStripeAccountId =
    sellerUser?.stripe_account_id ||
    sellerProfile?.stripe_account_id ||
    process.env.FALLBACK_STRIPE_ACCOUNT_ID ||
    null;
  const sellerEmail =
    sellerUser?.email || sellerProfile?.email || 'seller@robeo.local';

  let basePrice =
    negotiatedPrice !== null ? negotiatedPrice : Math.round(Number(productData.price) || 0);

  const bundleItemCount = Math.min(10, Math.max(1, Math.round(input.bundleItemCount || 1)));
  let bundleDiscountPercent = 0;

  if (bundleItemCount > 1 && sellerBundle.enabled) {
    bundleDiscountPercent = bundleDiscountPercentForCount(sellerBundle.tiers, bundleItemCount);
    basePrice = applyBundleDiscountToPrice(basePrice, bundleDiscountPercent);
  }

  const normalizedShippingCost =
    typeof input.shippingCost === 'number' && input.shippingCost > 0
      ? Math.round(input.shippingCost)
      : 0;

  const { buyerProtectionFee, total: totalAmount } = calculateCheckoutTotal(
    basePrice,
    normalizedShippingCost,
  );

  return {
    transactionId,
    productId: resolvedProductId,
    product: productData,
    sellerId,
    sellerEmail,
    sellerStripeAccountId,
    productPrice: basePrice,
    bundleItemCount,
    bundleDiscountPercent,
    buyerProtectionFee,
    shippingCost: normalizedShippingCost,
    totalAmount,
    negotiatedPrice,
    offerId,
  };
}

export async function resolveBundleCheckout(
  supabase: SupabaseClient,
  input: {
    productIds: string[];
    buyerId: string;
    shippingCost?: number;
    bundleDiscountPercent?: number;
  },
): Promise<CheckoutBundleResolved> {
  const { randomUUID } = await import('crypto');
  const transactionId = randomUUID();

  const uniqueIds = [...new Set(input.productIds.map(String).filter(Boolean))].slice(0, 8);
  if (uniqueIds.length < 2) {
    throw new Error('Csomag vásárláshoz legalább 2 termék szükséges.');
  }

  const { data: productsData, error: productsError } = await supabase
    .from('products')
    .select('id, user_id, name, description, image_url, price')
    .in('id', uniqueIds);

  if (productsError || !productsData || productsData.length !== uniqueIds.length) {
    throw new Error('Egy vagy több termék nem található.');
  }

  const products = productsData as CheckoutBundleProduct[];
  const sellerIds = new Set(products.map((p) => p.user_id));
  if (sellerIds.size !== 1) {
    throw new Error('Csomag vásárlásnál minden terméknek ugyanattól az eladótól kell származnia.');
  }

  const sellerId = products[0].user_id;
  if (sellerId === input.buyerId) {
    throw new Error('A saját termékedet nem vásárolhatod meg.');
  }

  const [{ data: sellerProfile }, { data: sellerUser }] = await Promise.all([
    supabase.from('profiles').select('email, stripe_account_id').eq('id', sellerId).maybeSingle(),
    supabase.from('users').select('stripe_account_id, email').eq('id', sellerId).maybeSingle(),
  ]);

  const sellerStripeAccountId =
    sellerUser?.stripe_account_id ||
    sellerProfile?.stripe_account_id ||
    process.env.FALLBACK_STRIPE_ACCOUNT_ID ||
    null;
  const sellerEmail = sellerUser?.email || sellerProfile?.email || 'seller@robeo.local';

  const subtotal = products.reduce((s, p) => s + Math.round(Number(p.price) || 0), 0);
  const bundleDiscountPercent = Math.min(
    50,
    Math.max(0, Math.round(input.bundleDiscountPercent || 0)),
  );
  const productPrice = applyBundleDiscountToPrice(subtotal, bundleDiscountPercent);

  const normalizedShippingCost =
    typeof input.shippingCost === 'number' && input.shippingCost > 0
      ? Math.round(input.shippingCost)
      : 0;

  const { buyerProtectionFee, total: totalAmount } = calculateCheckoutTotal(
    productPrice,
    normalizedShippingCost,
  );

  return {
    transactionId,
    primaryProductId: products[0].id,
    products,
    productIds: uniqueIds,
    sellerId,
    sellerEmail,
    sellerStripeAccountId,
    subtotal,
    bundleDiscountPercent,
    productPrice,
    buyerProtectionFee,
    shippingCost: normalizedShippingCost,
    totalAmount,
  };
}

export function buildBundleTransactionInsertRow(
  resolved: CheckoutBundleResolved,
  extras: {
    buyerId: string;
    shippingMethod: string;
    status: string;
    checkoutSessionId?: string | null;
    paymentIntentId?: string | null;
    paymentProvider: string;
    walletAmountPaid?: number;
    foxpostTerminal?: FoxpostTerminal | null;
  },
) {
  const row: Record<string, unknown> = {
    id: resolved.transactionId,
    product_id: resolved.primaryProductId,
    buyer_id: extras.buyerId,
    seller_id: resolved.sellerId,
    amount: resolved.totalAmount,
    fee: resolved.buyerProtectionFee,
    shipping_method: extras.shippingMethod || null,
    shipping_cost: resolved.shippingCost,
    status: extras.status,
    checkout_session_id: extras.checkoutSessionId ?? null,
    payment_intent_id: extras.paymentIntentId ?? null,
    payment_provider: extras.paymentProvider,
    wallet_amount_paid: extras.walletAmountPaid ?? 0,
    bundle_item_count: resolved.products.length,
    bundle_product_ids: resolved.productIds.join(','),
    bundle_discount_percent: resolved.bundleDiscountPercent,
  };

  if (extras.foxpostTerminal) {
    Object.assign(row, pickupFieldsFromFoxpost(extras.foxpostTerminal));
  }

  return row;
}

export function buildTransactionInsertRow(
  resolved: CheckoutResolved,
  extras: {
    buyerId: string;
    shippingMethod: string;
    status: string;
    checkoutSessionId?: string | null;
    paymentIntentId?: string | null;
    paymentProvider: string;
    walletAmountPaid?: number;
    foxpostTerminal?: FoxpostTerminal | null;
  },
) {
  const row: Record<string, unknown> = {
    id: resolved.transactionId,
    product_id: resolved.productId,
    buyer_id: extras.buyerId,
    seller_id: resolved.sellerId,
    amount: resolved.totalAmount,
    fee: resolved.buyerProtectionFee,
    shipping_method: extras.shippingMethod || null,
    shipping_cost: resolved.shippingCost,
    status: extras.status,
    checkout_session_id: extras.checkoutSessionId ?? null,
    payment_intent_id: extras.paymentIntentId ?? null,
    payment_provider: extras.paymentProvider,
    wallet_amount_paid: extras.walletAmountPaid ?? 0,
    bundle_item_count: resolved.bundleItemCount,
    bundle_discount_percent: resolved.bundleDiscountPercent,
  };

  if (extras.foxpostTerminal) {
    Object.assign(row, pickupFieldsFromFoxpost(extras.foxpostTerminal));
  }

  return row;
}

export function buyerAddressForCheckout(
  shippingMethod: string,
  foxpostTerminal: FoxpostTerminal | null,
  profile?: {
    location?: string | null;
    address?: string | null;
    address_line1?: string | null;
    city?: string | null;
    postal_code?: string | null;
    email?: string | null;
  } | null,
): string {
  if (shippingMethod === 'foxpost' && foxpostTerminal) {
    const addr = foxpostTerminalAddress(foxpostTerminal);
    const name = foxpostTerminal.name?.trim();
    return [name, addr].filter(Boolean).join(' — ') || addr || 'Foxpost automata';
  }
  if (!profile) return 'Nincs megadva';
  return (
    [profile.location, profile.address, profile.address_line1, profile.city, profile.postal_code]
      .filter(Boolean)
      .join(', ') ||
    profile.email ||
    'Nincs megadva'
  );
}
