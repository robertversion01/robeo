import type { Product } from '@/types';

const INVALID_URL_LITERALS = new Set([
  '',
  '-',
  'null',
  'undefined',
  'none',
  'n/a',
  'na',
  'false',
  'true',
]);

/** Whitespace-only, literál "null" / hibás rövid string kiszűrése */
export function normalizeHeroImageUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length < 12) return null;
  if (INVALID_URL_LITERALS.has(trimmed.toLowerCase())) return null;

  const lower = trimmed.toLowerCase();
  const looksLikeUrl =
    lower.startsWith('https://') ||
    lower.startsWith('http://') ||
    lower.startsWith('//') ||
    lower.startsWith('data:image/') ||
    lower.startsWith('blob:') ||
    (trimmed.startsWith('/') && trimmed.length > 12);

  return looksLikeUrl ? trimmed : null;
}

/** Hero pool: csak image_url vagy images[0], mindkettő validálva */
export function normalizePrimaryHeroImageUrl(product: Product): string | null {
  const fromImageUrl = normalizeHeroImageUrl(product.image_url);
  if (fromImageUrl) return fromImageUrl;
  if (Array.isArray(product.images) && product.images.length > 0) {
    return normalizeHeroImageUrl(product.images[0]);
  }
  return null;
}

export function hasHeroImage(product: Product): boolean {
  return normalizePrimaryHeroImageUrl(product) !== null;
}

export type HeroTileLike = {
  product: Product;
  imageUrl: string;
};

export function isValidHeroTile(tile: HeroTileLike): boolean {
  if (!hasHeroImage(tile.product)) return false;
  const primary = normalizePrimaryHeroImageUrl(tile.product);
  if (!primary) return false;
  const tileUrl = normalizeHeroImageUrl(tile.imageUrl);
  if (!tileUrl) return false;
  return tileUrl === primary;
}
