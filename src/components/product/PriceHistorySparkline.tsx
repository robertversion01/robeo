'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { getPriceHistory, type PriceSnapshot } from '@/lib/priceHistory';
import { formatPrice } from '@/lib/utils';

type Props = {
  productId: string;
  currentPrice: number;
};

export default function PriceHistorySparkline({ productId, currentPrice }: Props) {
  const { t } = useTranslation();
  const [history, setHistory] = useState<PriceSnapshot[]>([]);

  useEffect(() => {
    let cancelled = false;
    void getPriceHistory(supabase, productId).then((h) => {
      if (!cancelled) setHistory(h);
    });
    return () => {
      cancelled = true;
    };
  }, [productId, currentPrice]);

  if (history.length < 2) return null;

  const prices = [...history.map((s) => s.price), Math.round(currentPrice)];
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const w = 120;
  const h = 32;
  const step = w / (prices.length - 1);

  const points = prices
    .map((p, i) => {
      const x = i * step;
      const y = h - ((p - min) / range) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');

  const first = prices[0];
  const last = prices[prices.length - 1];
  const trendDown = last < first;

  return (
    <div className="mt-2 rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
        {t('pdp.priceHistory')}
      </p>
      <div className="flex items-end justify-between gap-3">
        <svg width={w} height={h} className="shrink-0" aria-hidden>
          <polyline
            fill="none"
            stroke={trendDown ? '#059669' : '#007782'}
            strokeWidth="2"
            strokeLinejoin="round"
            points={points}
          />
        </svg>
        <div className="text-[10px] text-gray-600 text-right tabular-nums">
          <div>
            {formatPrice(first)} → {formatPrice(last)}
          </div>
          {trendDown ? (
            <span className="text-emerald-700 font-semibold">{t('pdp.priceTrendDown')}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
