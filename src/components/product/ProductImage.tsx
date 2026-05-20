'use client';

import { useState, type ImgHTMLAttributes } from 'react';
import { normalizeProductImageUrl } from '@/lib/productImageValidation';
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
  ...rest
}: ProductImageProps) {
  const normalized = normalizeProductImageUrl(src);
  const [failed, setFailed] = useState(false);

  if (!normalized || (hideOnError && failed)) return null;

  return (
    <img
      {...rest}
      src={normalized}
      alt={alt}
      className={cn(className)}
      onError={(event) => {
        setFailed(true);
        onError?.(event);
      }}
    />
  );
}
