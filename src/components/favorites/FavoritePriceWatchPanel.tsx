'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bell, TrendingDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatPrice } from '@/lib/utils';
import {
  detectPriceDrops,
  listPriceWatches,
  removePriceWatch,
  upsertPriceWatch,
  type PriceDropHit,
} from '@/lib/priceWatch';
import { syncPriceWatchesToServer } from '@/lib/priceWatchSync';
import type { Product } from '@/types';

type Props = {
  products: Product[];
};

export default function FavoritePriceWatchPanel({ products }: Props) {
  const { t } = useTranslation();
  const [drops, setDrops] = useState<PriceDropHit[]>([]);
  const [watches, setWatches] = useState(listPriceWatches());

  useEffect(() => {
    for (const p of products) {
      const existing = watches.find((w) => w.productId === p.id);
      if (!existing) {
        upsertPriceWatch({
          productId: p.id,
          productName: p.name,
          lastPrice: p.price,
          alertEnabled: true,
        });
      }
    }
    setWatches(listPriceWatches());
    const next = listPriceWatches();
    setDrops(
      detectPriceDrops(
        products.map((p) => ({ id: p.id, name: p.name, price: p.price })),
      ),
    );
    void syncPriceWatchesToServer(next);
  }, [products]);

  const watchedCount = useMemo(
    () => watches.filter((w) => w.alertEnabled).length,
    [watches],
  );

  if (products.length === 0) return null;

  return (
    <div className="mb-6 space-y-3">
      <div className="flex items-start gap-2 rounded-xl border border-[#007782]/15 bg-[#007782]/5 px-3 py-2.5">
        <Bell size={16} className="mt-0.5 shrink-0 text-[#007782]" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#e7edf0]">{t('priceWatch.title')}</p>
          <p className="text-xs text-[#8fa3ad] mt-0.5">{t('priceWatch.hint', { count: watchedCount })}</p>
        </div>
      </div>

      {drops.length > 0 ? (
        <ul className="space-y-2">
          {drops.map((d) => (
            <li
              key={d.productId}
              className="flex items-center justify-between gap-3 rounded-xl border border-emerald-900/45 bg-emerald-950/35 px-3 py-2.5"
            >
              <div className="flex items-start gap-2 min-w-0">
                <TrendingDown size={18} className="shrink-0 text-emerald-300 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#e7edf0] truncate">{d.productName}</p>
                  <p className="text-xs text-emerald-300">
                    {formatPrice(d.oldPrice)} → {formatPrice(d.newPrice)}
                  </p>
                </div>
              </div>
              <Link
                href={`/products/${d.productId}`}
                className="shrink-0 text-xs font-semibold text-[#007782] hover:underline"
              >
                {t('priceWatch.view')}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-[#8fa3ad] px-1">{t('priceWatch.noDrops')}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {products.slice(0, 6).map((p) => {
          const w = watches.find((x) => x.productId === p.id);
          const on = w?.alertEnabled !== false;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                if (on) {
                  upsertPriceWatch({
                    productId: p.id,
                    productName: p.name,
                    lastPrice: p.price,
                    alertEnabled: false,
                  });
                } else {
                  upsertPriceWatch({
                    productId: p.id,
                    productName: p.name,
                    lastPrice: p.price,
                    alertEnabled: true,
                  });
                }
                const next = listPriceWatches();
                setWatches(next);
                void syncPriceWatchesToServer(next);
              }}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium border ${
                on
                  ? 'border-[#007782] bg-[#007782]/10 text-[#007782]'
                  : 'border-[#2a3941] text-[#8fa3ad]'
              }`}
            >
              {on ? t('priceWatch.watching') : t('priceWatch.paused')} {p.name.slice(0, 18)}
              {p.name.length > 18 ? '…' : ''}
            </button>
          );
        })}
      </div>
    </div>
  );
}
