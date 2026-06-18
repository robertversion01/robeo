/**
 * Utility functions for image handling and optimization
 */

import { getValidProductImageUrls } from '@/lib/productImageValidation';

const SUPABASE_OBJECT_PUBLIC_PATH = '/storage/v1/object/public/';
const SUPABASE_RENDER_PUBLIC_PATH = '/storage/v1/render/image/public/';

function clampTransformWidth(width: number): number {
  return Math.min(2500, Math.max(1, Math.round(width)));
}

function clampTransformQuality(quality: number): number {
  return Math.min(100, Math.max(20, Math.round(quality)));
}

function clampTransformHeight(height: number): number {
  return Math.min(2500, Math.max(1, Math.round(height)));
}

export type SupabaseTransformOptions = {
  height?: number;
  resize?: 'cover' | 'contain' | 'fill';
  /** Supabase auto-WebP Accept nélkül is: explicit webp/avif cache-barátabb. */
  format?: 'origin' | 'webp' | 'avif' | 'jpeg' | 'png';
};

/** Supabase Storage eredeti (nem transformált) public URL — query paraméterek nélkül. */
export function getOriginalStorageObjectUrl(url: string): string {
  if (!url) return '';

  try {
    const parsed = new URL(url);
    if (parsed.pathname.includes(SUPABASE_RENDER_PUBLIC_PATH)) {
      parsed.pathname = parsed.pathname.replace(
        SUPABASE_RENDER_PUBLIC_PATH,
        SUPABASE_OBJECT_PUBLIC_PATH,
      );
    }
    parsed.searchParams.delete('width');
    parsed.searchParams.delete('quality');
    parsed.searchParams.delete('height');
    parsed.searchParams.delete('resize');
    const qs = parsed.searchParams.toString();
    return qs ? `${parsed.origin}${parsed.pathname}?${qs}` : `${parsed.origin}${parsed.pathname}`;
  } catch {
    const withoutQuery = url.split('?')[0] ?? url;
    return withoutQuery.replace(SUPABASE_RENDER_PUBLIC_PATH, SUPABASE_OBJECT_PUBLIC_PATH);
  }
}

export function isSupabaseTransformImageUrl(url: string): boolean {
  return url.includes(SUPABASE_RENDER_PUBLIC_PATH);
}

/**
 * Supabase Image Transformations URL — a /object/public/ query paraméterek nem méreteznek.
 * @see https://supabase.com/docs/guides/storage/serving/image-transformations
 */
export function getOptimizedImageUrl(
  url: string | null,
  width: number = 400,
  quality: number = 80,
  options: SupabaseTransformOptions = {},
): string {
  if (!url) return '';

  const original = getOriginalStorageObjectUrl(url);
  if (!original.includes(SUPABASE_OBJECT_PUBLIC_PATH)) return original;

  const renderUrl = original.replace(SUPABASE_OBJECT_PUBLIC_PATH, SUPABASE_RENDER_PUBLIC_PATH);
  const w = clampTransformWidth(width);
  const q = clampTransformQuality(quality);
  const params = new URLSearchParams({
    width: String(w),
    quality: String(q),
  });
  if (typeof options.height === 'number') {
    params.set('height', String(clampTransformHeight(options.height)));
  }
  if (options.resize) {
    params.set('resize', options.resize);
  }
  if (options.format && options.format !== 'origin') {
    params.set('format', options.format);
  }
  return `${renderUrl}?${params.toString()}`;
}

/** Több felbontású srcset mobil/retina kijelzőkhöz. */
export function getOptimizedImageSrcSet(
  url: string | null,
  widths: number[],
  quality: number = 80,
  options: SupabaseTransformOptions = {},
): string | undefined {
  if (!url || widths.length === 0) return undefined;
  const entries = widths
    .map((w) => clampTransformWidth(w))
    .filter((w, idx, arr) => arr.indexOf(w) === idx)
    .sort((a, b) => a - b)
    .map((w) => `${getOptimizedImageUrl(url, w, quality, options)} ${w}w`);
  return entries.length > 0 ? entries.join(', ') : undefined;
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

export type CompressImageOptions = {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxBytes?: number;
};

/** Kliens oldali tömörítés — mobilon a 8–12 MP fotók base64/draft nélkül is kezelhetők. */
export async function compressImageFileForUpload(
  file: File,
  options: CompressImageOptions = {},
): Promise<File> {
  const maxWidth = options.maxWidth ?? 1600;
  const maxHeight = options.maxHeight ?? 1600;
  const quality = options.quality ?? 0.82;
  const maxBytes = options.maxBytes ?? 2.5 * 1024 * 1024;

  const looksLikeImage =
    file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name);
  if (!looksLikeImage) {
    throw new Error('Not an image file');
  }

  if (file.size <= 350_000 && /image\/(jpeg|webp|png)/i.test(file.type)) {
    return file;
  }

  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') {
    return file.size <= maxBytes ? file : file;
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file.size <= maxBytes ? file : file;
  }

  let width = bitmap.width;
  let height = bitmap.height;
  const scale = Math.min(1, maxWidth / width, maxHeight / height);
  width = Math.max(1, Math.round(width * scale));
  height = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close?.();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', quality);
  });
  if (!blob) return file;
  if (blob.size >= file.size && file.size <= maxBytes) return file;

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo';
  return new File([blob], `${baseName}.jpg`, {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });
}
