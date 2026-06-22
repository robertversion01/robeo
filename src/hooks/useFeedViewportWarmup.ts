'use client';

import { useEffect, useRef } from 'react';
import type { VirtualItem } from '@tanstack/react-virtual';
import { imageFromPreset, type ImagePresetName } from '@/lib/imagePresets';
import { preloadPresetSrc } from '@/lib/preloadImage';
import { normalizePrimaryProductImageUrl } from '@/lib/productImageValidation';
import type { Product } from '@/types';

type Options = {
  products: Product[];
  preset: ImagePresetName;
  virtualRows: VirtualItem[];
  columnCount: number;
  priorityCount: number;
  enabled: boolean;
};

/** Látható + következő sor képeinek előmelegítése scroll közben. */
export function useFeedViewportWarmup({
  products,
  preset,
  virtualRows,
  columnCount,
  priorityCount,
  enabled,
}: Options) {
  const lastKeyRef = useRef('');

  useEffect(() => {
    if (!enabled || products.length === 0 || virtualRows.length === 0) return;

    const rowIndices = virtualRows.map((r) => r.index);
    const maxRow = Math.max(...rowIndices);
    const warmupRows = new Set(rowIndices);
    warmupRows.add(maxRow + 1);

    const productIndices = new Set<number>();
    for (const row of warmupRows) {
      for (let col = 0; col < columnCount; col++) {
        const idx = row * columnCount + col;
        if (idx < products.length) productIndices.add(idx);
      }
    }

    const key = [...productIndices].sort((a, b) => a - b).join(',');
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;

    for (const idx of productIndices) {
      const raw = normalizePrimaryProductImageUrl(products[idx]);
      if (!raw) continue;
      const resolved = imageFromPreset(raw, preset);
      const priority = idx < priorityCount ? 'high' : 'low';
      preloadPresetSrc(resolved.src, resolved.srcSet, priority);
    }
  }, [products, preset, virtualRows, columnCount, priorityCount, enabled]);
}
