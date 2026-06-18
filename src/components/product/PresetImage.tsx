'use client';

import { useEffect, useMemo, useState, type ImgHTMLAttributes } from 'react';
import { normalizeProductImageUrl } from '@/lib/productImageValidation';
import {
  getOriginalStorageObjectUrl,
  isSupabaseTransformImageUrl,
} from '@/lib/imageUtils';
import {
  imageFromPreset,
  type ImagePresetName,
} from '@/lib/imagePresets';
import { cn } from '@/lib/utils';

type PresetImageProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  'src' | 'srcSet' | 'sizes' | 'width' | 'height' | 'loading' | 'fetchPriority'
> & {
  url: string | null | undefined;
  preset: ImagePresetName;
  /** Fold feletti / LCP — eager + fetchpriority high */
  priority?: boolean;
  /** Explicit lazy override */
  lazy?: boolean;
  hideOnError?: boolean;
};

/**
 * Egyetlen belépési pont preset-alapú képekhez: srcset, sizes, WebP/AVIF, lazy policy.
 */
export default function PresetImage({
  url,
  preset,
  priority = false,
  lazy,
  hideOnError = true,
  className,
  alt = '',
  onError,
  decoding,
  style,
  ...rest
}: PresetImageProps) {
  const normalized = normalizeProductImageUrl(url);
  const resolved = useMemo(
    () => imageFromPreset(normalized, preset, { priority, lazy }),
    [normalized, preset, priority, lazy],
  );

  const [useOriginalFallback, setUseOriginalFallback] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setUseOriginalFallback(false);
    setFailed(false);
  }, [normalized, preset]);

  const displaySrc = useMemo(() => {
    if (!resolved.src) return null;
    if (useOriginalFallback && isSupabaseTransformImageUrl(resolved.src)) {
      return getOriginalStorageObjectUrl(resolved.src);
    }
    return resolved.src;
  }, [resolved.src, useOriginalFallback]);

  if (!displaySrc || (hideOnError && failed)) return null;

  const imgProps = {
    ...rest,
    alt,
    width: resolved.width,
    height: resolved.height,
    sizes: resolved.sizes,
    loading: resolved.loading,
    fetchPriority: resolved.fetchPriority,
    decoding: decoding ?? 'async',
    className: cn(className),
    style: {
      backgroundColor: '#0f1a1d',
      backgroundImage: resolved.placeholder ? `url(${resolved.placeholder})` : undefined,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      ...style,
    },
    onError: (event: React.SyntheticEvent<HTMLImageElement>) => {
      if (
        !useOriginalFallback &&
        resolved.src &&
        isSupabaseTransformImageUrl(resolved.src)
      ) {
        setUseOriginalFallback(true);
        return;
      }
      setFailed(true);
      onError?.(event);
    },
  };

  const hasAvif = Boolean(resolved.avifSrcSet);
  const hasWebpSrcSet = Boolean(resolved.srcSet);

  if (hasAvif || hasWebpSrcSet) {
    return (
      <picture>
        {hasAvif ? (
          <source srcSet={resolved.avifSrcSet} sizes={resolved.sizes} type="image/avif" />
        ) : null}
        {hasWebpSrcSet ? (
          <source srcSet={resolved.srcSet} sizes={resolved.sizes} type="image/webp" />
        ) : null}
        <img {...imgProps} src={displaySrc} />
      </picture>
    );
  }

  return <img {...imgProps} src={displaySrc} />;
}
