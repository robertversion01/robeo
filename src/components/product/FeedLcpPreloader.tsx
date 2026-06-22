'use client';

import { useEffect, useMemo } from 'react';
import { imageFromPreset } from '@/lib/imagePresets';
import { preloadPresetSrc } from '@/lib/preloadImage';
import { normalizePrimaryProductImageUrl } from '@/lib/productImageValidation';
import type { Product } from '@/types';
import type { ImagePresetName } from '@/lib/imagePresets';

type Props = {
  products: Product[];
  preset: ImagePresetName;
  count?: number;
  /** Hány kép kapjon high priority preloadot */
  priorityHighCount?: number;
};

/** Első viewport képek preload — LCP + következő sor alacsony prioritással. */
export default function FeedLcpPreloader({
  products,
  preset,
  count,
  priorityHighCount = 4,
}: Props) {
  const sliceCount = count ?? products.length;
  const preloadKey = useMemo(
    () => products.slice(0, sliceCount).map((p) => p.id).join(','),
    [products, sliceCount],
  );

  useEffect(() => {
    if (!preloadKey) return;
    const slice = products.slice(0, sliceCount);
    slice.forEach((p, index) => {
      const raw = normalizePrimaryProductImageUrl(p);
      if (!raw) return;
      const resolved = imageFromPreset(raw, preset, { priority: index < priorityHighCount });
      preloadPresetSrc(
        resolved.src,
        resolved.srcSet,
        index < priorityHighCount ? 'high' : 'low',
      );
    });
  }, [preloadKey, products, preset, sliceCount, priorityHighCount]);

  return null;
}
