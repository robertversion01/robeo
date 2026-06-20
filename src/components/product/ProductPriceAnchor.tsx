'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import {
  fetchSimilarPriceHint,
  formatPriceHintRange,
  type SimilarPriceHint,
} from '@/lib/listingPriceHint';
import { cn, formatPrice } from '@/lib/utils';

type Props = {
  category?: string | null;
  brand?: string | null;
  condition?: string | null;
  price: number;
  listingType?: 'product' | 'service';
  className?: string;
};

type PriceVerdict = 'good' | 'fair' | 'high';

function verdictForPrice(price: number, hint: SimilarPriceHint): PriceVerdict {
  const { low, high } = formatPriceHintRange(hint);
  if (price <= high && price >= low) return 'good';
  if (price < low) return 'good';
  if (price <= hint.median * 1.25) return 'fair';
  return 'high';
}

export default function ProductPriceAnchor({
  category,
  brand,
  condition,
  price,
  listingType = 'product',
  className,
}: Props) {
  const { t } = useTranslation();
  const [hint, setHint] = useState<SimilarPriceHint | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchSimilarPriceHint(supabase, {
      category: category ?? undefined,
      brand: brand ?? undefined,
      condition: condition ?? undefined,
      listingType,
    }).then((h) => {
      if (!cancelled) setHint(h);
    });
    return () => {
      cancelled = true;
    };
  }, [category, brand, condition, listingType]);

  if (!hint || hint.sampleCount < 2) return null;

  const verdict = verdictForPrice(price, hint);
  const { low, high } = formatPriceHintRange(hint);

  const tone =
    verdict === 'good'
      ? 'text-emerald-400 border-emerald-900/50 bg-emerald-950/30'
      : verdict === 'fair'
        ? 'text-amber-300 border-amber-900/45 bg-amber-950/25'
        : 'text-rose-300 border-rose-900/45 bg-rose-950/25';

  return (
    <div className={cn('rounded-lg border px-2.5 py-2 text-xs', tone, className)}>
      <p className="font-semibold">{t(`pdp.priceAnchor.verdict_${verdict}`)}</p>
      <p className="mt-0.5 text-[#b2c0c6]">
        {t('pdp.priceAnchor.range', {
          low: formatPrice(low),
          high: formatPrice(high),
          median: formatPrice(hint.median),
          count: hint.sampleCount,
        })}
      </p>
    </div>
  );
}
