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
import { useConnectionProfile } from '@/hooks/useConnectionProfile';
import { cn } from '@/lib/utils';

const LQIP_PRESETS = new Set<ImagePresetName>([
  'homepageFeed',
  'feedCard',
  'pdpMain',
  'pdpCarouselIdle',
  'pdpViewer',
  'railCard',
  'profileGrid',
  'heroTile',
]);

type PresetImageProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  'src' | 'srcSet' | 'sizes' | 'width' | 'height' | 'loading' | 'fetchPriority'
> & {
  url: string | null | undefined;
  preset: ImagePresetName;
  priority?: boolean;
  lazy?: boolean;
  hideOnError?: boolean;
  /** Apró blur LQIP — feed és PDP */
  showPlaceholder?: boolean;
};

export default function PresetImage({
  url,
  preset,
  priority = false,
  lazy,
  hideOnError = true,
  showPlaceholder = true,
  className,
  alt = '',
  onError,
  onLoad,
  decoding,
  style,
  ...rest
}: PresetImageProps) {
  const normalized = normalizeProductImageUrl(url);
  const connection = useConnectionProfile();
  const resolved = useMemo(
    () => imageFromPreset(normalized, preset, { priority, lazy, connection }),
    [normalized, preset, priority, lazy, connection],
  );

  const [useOriginalFallback, setUseOriginalFallback] = useState(false);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const useLqip = showPlaceholder && LQIP_PRESETS.has(preset) && Boolean(resolved.placeholder);

  useEffect(() => {
    setUseOriginalFallback(false);
    setFailed(false);
    setLoaded(false);
  }, [normalized, preset]);

  const displaySrc = useMemo(() => {
    if (!resolved.src) return null;
    if (useOriginalFallback && isSupabaseTransformImageUrl(resolved.src)) {
      return getOriginalStorageObjectUrl(resolved.src);
    }
    return resolved.src;
  }, [resolved.src, useOriginalFallback]);

  if (!displaySrc || (hideOnError && failed)) return null;

  const handleLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    setLoaded(true);
    onLoad?.(event);
  };

  const imgProps = {
    ...rest,
    alt,
    sizes: resolved.sizes,
    loading: resolved.loading,
    fetchPriority: resolved.fetchPriority,
    decoding: decoding ?? (priority ? 'sync' : 'async'),
    className: cn(
      'preset-image-main block size-full max-w-none max-h-none',
      useLqip && 'transition-opacity duration-200 ease-out',
      useLqip && !loaded && 'opacity-0',
      useLqip && loaded && 'opacity-100',
      className,
    ),
    style,
    onLoad: handleLoad,
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

  const mainImage =
    hasAvif || hasWebpSrcSet ? (
      <picture className="block size-full">
        {hasAvif ? (
          <source srcSet={resolved.avifSrcSet} sizes={resolved.sizes} type="image/avif" />
        ) : null}
        {hasWebpSrcSet ? (
          <source srcSet={resolved.srcSet} sizes={resolved.sizes} type="image/webp" />
        ) : null}
        <img {...imgProps} src={displaySrc} ref={(node) => {
          if (node?.complete && node.naturalWidth > 0) setLoaded(true);
        }} />
      </picture>
    ) : (
      <img
        {...imgProps}
        src={displaySrc}
        ref={(node) => {
          if (node?.complete && node.naturalWidth > 0) setLoaded(true);
        }}
      />
    );

  if (!useLqip) return mainImage;

  return (
    <div className="preset-image-shell relative size-full overflow-hidden bg-[#0f1a1d]/40">
      <img
        src={resolved.placeholder}
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 size-full scale-105 object-cover object-center blur-lg opacity-90"
        decoding="async"
        fetchPriority="low"
      />
      <div className="relative z-[1] size-full">{mainImage}</div>
    </div>
  );
}
