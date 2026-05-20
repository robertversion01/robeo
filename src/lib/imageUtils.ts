/**
 * Utility functions for image handling and optimization
 */

import { getValidProductImageUrls } from '@/lib/productImageValidation';

/**
 * Formats an image URL for optimal loading
 */
export function getOptimizedImageUrl(
  url: string | null,
  width: number = 400,
  quality: number = 80,
): string {
  if (!url) return '';

  if (url.includes('supabase.co/storage/v1/object/public')) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}width=${width}&quality=${quality}`;
  }

  return url;
}

export function getPlaceholderImage(
  text: string = 'No Image',
  width: number = 400,
  height: number = 500,
): string {
  return `https://placehold.co/${width}x${height}/e0e0e0/a0a0a0?text=${encodeURIComponent(text)}`;
}

/** Normalizes product.images from JSONB (string[], JSON string, or {url} objects). */
export function normalizeProductImageUrls(images: unknown): string[] {
  if (images == null) return [];

  let parsed: unknown = images;
  if (typeof images === 'string') {
    const trimmed = images.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        return [trimmed];
      }
    } else {
      return [trimmed];
    }
  }

  if (!Array.isArray(parsed)) return [];

  const urls: string[] = [];
  for (const entry of parsed) {
    if (typeof entry === 'string') {
      const url = entry.trim();
      if (url) urls.push(url);
      continue;
    }
    if (entry && typeof entry === 'object') {
      const record = entry as Record<string, unknown>;
      const candidate =
        (typeof record.url === 'string' && record.url) ||
        (typeof record.publicUrl === 'string' && record.publicUrl) ||
        (typeof record.path === 'string' && record.path) ||
        '';
      const url = candidate.trim();
      if (url) urls.push(url);
    }
  }
  return urls;
}

/** Validált termékképek — nincs placehold.co fallback */
export function getProductImages(product: {
  image_url: string | null;
  images?: unknown;
}): string[] {
  return getValidProductImageUrls(product);
}

export function shouldLazyLoad(index: number): boolean {
  return index >= 2;
}
