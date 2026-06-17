'use client';

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Product } from '@/types';

type Props = {
  products: Product[];
  favoriteIds: Set<string>;
  preferredCategory?: string;
  /** search = rövid, katalógus-kontextus; feed = személyre szabott banner */
  mode?: 'feed' | 'search';
};

export default function FeedPersonalizationBanner({
  products,
  favoriteIds,
  preferredCategory,
  mode = 'feed',
}: Props) {
  const { t } = useTranslation();

  const hint = useMemo(() => {
    if (mode === 'search') {
      if (preferredCategory && preferredCategory !== 'all') {
        return t('browse.feed.searchCategoryHint', { category: preferredCategory });
      }
      return t('browse.feed.searchHint');
    }
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
  }, [favoriteIds.size, mode, preferredCategory, products, t]);

  if (mode === 'search' && !preferredCategory) {
    return null;
  }

  return (
    <div
      className={cn(
        'mb-3 flex items-start gap-2 rounded-xl border border-[#007782]/15 bg-[#007782]/5 px-3 py-2.5',
        mode === 'search' && 'py-2 mb-2',
      )}
    >
      <Sparkles size={mode === 'search' ? 14 : 16} className="mt-0.5 shrink-0 text-[#007782]" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className={cn('leading-relaxed text-[#b2c0c6]', mode === 'search' ? 'text-[11px]' : 'text-xs')}>
          {hint}
        </p>
        {mode === 'feed' ? (
          <Link
            href="/profile?tab=settings"
            className="mt-1 inline-block text-[11px] font-semibold text-[#007782] hover:underline"
          >
            {t('browse.feed.tunePrefs')} →
          </Link>
        ) : null}
      </div>
    </div>
  );
}
