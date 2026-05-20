import {
  applyBundleDiscountToPrice,
  bundleDiscountPercentForCount,
  type SellerBundleDiscountSettings,
} from '@/lib/bundleDiscount';

export type BundleCartItem = {
  productId: string;
  name: string;
  price: number;
  imageUrl?: string | null;
};

export type SellerBundleCart = {
  sellerId: string;
  items: BundleCartItem[];
  updatedAt: string;
};

const STORAGE_KEY = 'robeo_seller_bundle_cart_v1';

function readRaw(): SellerBundleCart | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SellerBundleCart;
  } catch {
    return null;
  }
}

function writeRaw(cart: SellerBundleCart | null) {
  if (typeof window === 'undefined') return;
  if (!cart || cart.items.length === 0) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
}

export function getBundleCart(): SellerBundleCart | null {
  return readRaw();
}

export function clearBundleCart() {
  writeRaw(null);
}

export function addToBundleCart(
  sellerId: string,
  item: BundleCartItem,
  maxItems = 8,
): SellerBundleCart {
  const existing = readRaw();
  const base: SellerBundleCart =
    existing?.sellerId === sellerId
      ? existing
      : { sellerId, items: [], updatedAt: new Date().toISOString() };

  const without = base.items.filter((i) => i.productId !== item.productId);
  const items = [{ ...item }, ...without].slice(0, maxItems);
  const next = { sellerId, items, updatedAt: new Date().toISOString() };
  writeRaw(next);
  return next;
}

export function removeFromBundleCart(productId: string): SellerBundleCart | null {
  const existing = readRaw();
  if (!existing) return null;
  const items = existing.items.filter((i) => i.productId !== productId);
  if (items.length === 0) {
    writeRaw(null);
    return null;
  }
  const next = { ...existing, items, updatedAt: new Date().toISOString() };
  writeRaw(next);
  return next;
}

export function isInBundleCart(productId: string): boolean {
  return readRaw()?.items.some((i) => i.productId === productId) ?? false;
}

export function computeBundleTotals(
  items: BundleCartItem[],
  settings: SellerBundleDiscountSettings,
) {
  const subtotal = items.reduce((sum, i) => sum + (Number(i.price) || 0), 0);
  const pct = settings.enabled
    ? bundleDiscountPercentForCount(settings.tiers, items.length)
    : 0;
  const discounted = applyBundleDiscountToPrice(subtotal, pct);
  return { subtotal, discountPercent: pct, total: discounted, savings: subtotal - discounted };
}
