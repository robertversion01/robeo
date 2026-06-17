'use client';

import { useEffect, useMemo, useState, type ImgHTMLAttributes } from 'react';
import { normalizeProductImageUrl } from '@/lib/productImageValidation';
import {
  getOriginalStorageObjectUrl,
  isSupabaseTransformImageUrl,
} from '@/lib/imageUtils';
import { cn } from '@/lib/utils';

type ProductImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  src: string | null | undefined;
  /** Ha true (default), hiba esetén null — nincs üres doboz */
  hideOnError?: boolean;
};

export default function ProductImage({
  src,
  hideOnError = true,
  className,
  alt = '',
  onError,
  loading,
  decoding,
  ...rest
}: ProductImageProps) {
  const normalized = normalizeProductImageUrl(src);
  const [useOriginalFallback, setUseOriginalFallback] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setUseOriginalFallback(false);
    setFailed(false);
  }, [normalized]);

  const displaySrc = useMemo(() => {
    if (!normalized) return null;
    if (useOriginalFallback && isSupabaseTransformImageUrl(normalized)) {
      return getOriginalStorageObjectUrl(normalized);
    }
    return normalized;
  }, [normalized, useOriginalFallback]);

  if (!displaySrc || (hideOnError && failed)) return null;

  return (
    <img
      {...rest}
      src={displaySrc}
      alt={alt}
      loading={loading ?? 'lazy'}
      decoding={decoding ?? 'async'}
      className={cn(className)}
      onError={(event) => {
        if (
          !useOriginalFallback &&
          normalized &&
          isSupabaseTransformImageUrl(normalized)
        ) {
          setUseOriginalFallback(true);
          return;
        }
        setFailed(true);
        onError?.(event);
      }}
    />
  );
}
