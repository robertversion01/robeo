'use client';

import { useCallback, useEffect, useState } from 'react';
import { BarChart3, Eye, MousePointerClick, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { getOptimizedImageUrl } from '@/lib/imageUtils';
import type { PromoteAnalyticsRow } from '@/lib/promoteAnalytics';

type Props = {
  userId: string | null | undefined;
};

export default function PromoteAnalyticsCard({ userId }: Props) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<PromoteAnalyticsRow[]>([]);
  const [totals, setTotals] = useState({ activeBoosts: 0, totalViews: 0, totalClicks: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch('/api/seller/promote-analytics', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setRows(data.rows || []);
        setTotals(data.totals || { activeBoosts: 0, totalViews: 0, totalClicks: 0 });
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!userId) return null;

  return (
    <section className="mb-8 rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-50/90 via-white to-amber-50/50 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 size={20} className="text-violet-700" />
          <div>
            <h2 className="text-lg font-bold text-gray-900">{t('promote.statsTitle')}</h2>
            <p className="text-xs text-gray-600">{t('promote.statsHint')}</p>
          </div>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wide text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
          Demo
        </span>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">{t('common.loading')}</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="rounded-xl bg-white/90 border border-violet-100 px-3 py-2 text-center">
              <p className="text-[10px] uppercase text-gray-500">{t('promote.activeBoosts')}</p>
              <p className="text-xl font-bold text-violet-700 tabular-nums">{totals.activeBoosts}</p>
            </div>
            <div className="rounded-xl bg-white/90 border border-violet-100 px-3 py-2 text-center">
              <p className="text-[10px] uppercase text-gray-500 flex items-center justify-center gap-0.5">
                <Eye size={10} /> {t('promote.views')}
              </p>
              <p className="text-xl font-bold tabular-nums">{totals.totalViews.toLocaleString('hu-HU')}</p>
            </div>
            <div className="rounded-xl bg-white/90 border border-violet-100 px-3 py-2 text-center">
              <p className="text-[10px] uppercase text-gray-500 flex items-center justify-center gap-0.5">
                <MousePointerClick size={10} /> {t('promote.clicks')}
              </p>
              <p className="text-xl font-bold tabular-nums">{totals.totalClicks.toLocaleString('hu-HU')}</p>
            </div>
          </div>

          {rows.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">{t('promote.empty')}</p>
          ) : (
            <ul className="divide-y divide-violet-100/80 rounded-xl border border-violet-100 bg-white/80 overflow-hidden max-h-64 overflow-y-auto">
              {rows.slice(0, 12).map((row) => (
                <li key={row.productId} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                    {row.imageUrl ? (
                      <img
                        src={getOptimizedImageUrl(row.imageUrl, 80, 80)}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{row.name}</p>
                    <p className="text-[10px] text-gray-500">
                      {row.isActive ? (
                        <span className="text-emerald-700 font-semibold inline-flex items-center gap-0.5">
                          <Sparkles size={10} /> {t('promote.live')}
                        </span>
                      ) : (
                        t('promote.ended')
                      )}
                      {row.featuredUntil
                        ? ` · ${new Date(row.featuredUntil).toLocaleDateString('hu-HU')}`
                        : ''}
                    </p>
                  </div>
                  <div className="text-right text-[10px] tabular-nums text-gray-600 shrink-0">
                    <div>{row.demoViews} {t('promote.viewsShort')}</div>
                    <div>{row.estimatedCtr}% CTR</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
