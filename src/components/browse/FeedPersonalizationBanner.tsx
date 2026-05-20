'use client';

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import type { Product } from '@/types';

type Props = {
  products: Product[];
  favoriteIds: Set<string>;
  preferredCategory?: string;
};

export default function FeedPersonalizationBanner({
  products,
  favoriteIds,
  preferredCategory,
}: Props) {
  const { t } = useTranslation();

  const hint = useMemo(() => {
    if (preferredCategory && preferredCategory !== 'all') {
      return t('browse.feed.categoryHint', { category: preferredCategory });
    }
    if (favoriteIds.size > 0) {
      return t('browse.feed.favoritesHint', { count: favoriteIds.size });
    }
    const brands = products
      .map((p) => p.brand)
      .filter(Boolean)
      .slice(0, 3);
    if (brands.length > 0) {
      return t('browse.feed.trendingBrands', { brands: brands.join(', ') });
    }
    return t('browse.feed.default');
  }, [favoriteIds.size, preferredCategory, products, t]);

  return (
    <div className="mb-3 flex items-start gap-2 rounded-xl border border-[#007782]/15 bg-[#007782]/5 px-3 py-2.5">
      <Sparkles size={16} className="mt-0.5 shrink-0 text-[#007782]" aria-hidden />
      <p className="text-xs leading-relaxed text-gray-700">{hint}</p>
    </div>
  );
}
