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

/** Érvényes, nem üres, nem szemét literál URL */
export function normalizeProductImageUrl(value: unknown): string | null {
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

function rawImageCandidates(product: {
  image_url?: string | null;
  images?: unknown;
}): unknown[] {
  const out: unknown[] = [];
  if (product.image_url != null) out.push(product.image_url);

  const images = product.images;
  if (images == null) return out;

  if (typeof images === 'string') {
    const trimmed = images.trim();
    if (!trimmed) return out;
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        if (Array.isArray(parsed)) out.push(...parsed);
        else out.push(parsed);
      } catch {
        out.push(trimmed);
      }
    } else {
      out.push(trimmed);
    }
    return out;
  }

  if (Array.isArray(images)) {
    for (const entry of images) {
      if (typeof entry === 'string') out.push(entry);
      else if (entry && typeof entry === 'object') {
        const record = entry as Record<string, unknown>;
        out.push(
          record.url ?? record.publicUrl ?? record.path ?? null,
        );
      }
    }
  }

  return out;
}

/** Elsődleges kép: image_url, majd images[0] */
export function normalizePrimaryProductImageUrl(product: {
  image_url?: string | null;
  images?: unknown;
}): string | null {
  for (const candidate of rawImageCandidates(product)) {
    const normalized = normalizeProductImageUrl(candidate);
    if (normalized) return normalized;
  }
  return null;
}

export function hasValidProductImage(product: {
  image_url?: string | null;
  images?: unknown;
}): boolean {
  return normalizePrimaryProductImageUrl(product) !== null;
}

/** Galéria — csak valid URL-ek, placeholder nélkül */
export function getValidProductImageUrls(product: {
  image_url?: string | null;
  images?: unknown;
}): string[] {
  const urls: string[] = [];
  for (const candidate of rawImageCandidates(product)) {
    const normalized = normalizeProductImageUrl(candidate);
    if (normalized && !urls.includes(normalized)) urls.push(normalized);
  }
  return urls;
}

export function filterProductsWithValidImages<T extends Product>(products: T[]): T[] {
  return products.filter(hasValidProductImage);
}

export type HeroTileLike = {
  product: Product;
  imageUrl: string;
};

export function isValidHeroTile(tile: HeroTileLike): boolean {
  if (!hasValidProductImage(tile.product)) return false;
  const primary = normalizePrimaryProductImageUrl(tile.product);
  if (!primary) return false;
  const tileUrl = normalizeProductImageUrl(tile.imageUrl);
  if (!tileUrl) return false;
  return tileUrl === primary;
}

// Hero aliasok (visszafelé kompatibilitás)
export const normalizeHeroImageUrl = normalizeProductImageUrl;
export const normalizePrimaryHeroImageUrl = normalizePrimaryProductImageUrl;
export const hasHeroImage = hasValidProductImage;
