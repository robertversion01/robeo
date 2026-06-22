'use client';

import { useEffect, useMemo } from 'react';
import { imageFromPreset } from '@/lib/imagePresets';
import { preloadImageUrls } from '@/lib/preloadImage';
import { normalizePrimaryProductImageUrl } from '@/lib/productImageValidation';
import type { Product } from '@/types';
import type { ImagePresetName } from '@/lib/imagePresets';

type Props = {
  products: Product[];
  preset: ImagePresetName;
  count?: number;
};

/** Első viewport képek preload — LCP resource load delay csökkentése. */
export default function FeedLcpPreloader({ products, preset, count = 2 }: Props) {
  const preloadKey = useMemo(
    () => products.slice(0, count).map((p) => p.id).join(','),
    [products, count],
  );

  useEffect(() => {
    if (!preloadKey) return;
    const slice = products.slice(0, count);
    const urls = slice.map((p) => {
      const raw = normalizePrimaryProductImageUrl(p);
      if (!raw) return null;
      return imageFromPreset(raw, preset, { priority: true }).src;
    });
    preloadImageUrls(urls, 'high');
  }, [preloadKey, products, preset, count]);

  return null;
}
