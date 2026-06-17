'use client';

import { useEffect, useState } from 'react';
import { TrendingDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { getPriceHistory, hasPriceDropped } from '@/lib/priceHistory';

type Props = {
  productId: string;
  currentPrice: number;
};

export default function PriceHistoryBadge({ productId, currentPrice }: Props) {
  const { t } = useTranslation();
  const [dropped, setDropped] = useState(false);
  const [prevPrice, setPrevPrice] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getPriceHistory(supabase, productId).then((hist) => {
      if (cancelled) return;
      const localDrop = hasPriceDropped(productId, currentPrice);
      if (hist.length >= 2) {
        const prev = hist[hist.length - 2].price;
        setPrevPrice(prev);
        setDropped(Math.round(currentPrice) < prev || localDrop);
      } else {
        setDropped(localDrop);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [productId, currentPrice]);

  if (!dropped) return null;

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-900/45 bg-emerald-950/40 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
      <TrendingDown size={12} />
      {prevPrice != null
        ? t('pdp.priceDropped', { from: prevPrice, to: Math.round(currentPrice) })
        : t('pdp.priceDroppedShort')}
    </span>
  );
}
