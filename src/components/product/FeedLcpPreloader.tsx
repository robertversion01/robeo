'use client';

import { useEffect } from 'react';
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
  useEffect(() => {
    if (products.length === 0) return;
    const urls = products.slice(0, count).map((p) => {
      const raw = normalizePrimaryProductImageUrl(p);
      if (!raw) return null;
      return imageFromPreset(raw, preset, { priority: true }).src;
    });
    preloadImageUrls(urls, 'high');
  }, [products, preset, count]);

  return null;
}
