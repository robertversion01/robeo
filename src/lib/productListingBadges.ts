import type { Product } from '@/types';

export type ListingAgeBadge = 'just_now' | 'new';

export function getListingAgeBadge(
  product: Pick<Product, 'created_at' | 'status'>,
  nowMs = Date.now(),
): ListingAgeBadge | null {
  if (product.status === 'sold' || product.status === 'reserved') return null;
  const ageMs = nowMs - new Date(product.created_at).getTime();
  if (!Number.isFinite(ageMs) || ageMs < 0) return null;
  if (ageMs <= 2 * 60 * 60 * 1000) return 'just_now';
  if (ageMs <= 3 * 24 * 60 * 60 * 1000) return 'new';
  return null;
}

export function getProductCardImages(product: Product): string[] {
  const fromArray = (product.images || []).filter(Boolean);
  if (fromArray.length > 0) return fromArray;
  if (product.image_url) return [product.image_url];
  return [];
}
