'use client';

import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { BUDAPEST_DISTRICTS } from '@/lib/budapestDistricts';
import { catalogUrlFromFilters } from '@/lib/catalogUrlParams';
import type { CatalogFilterState } from '@/lib/catalogFilters';
import { fetchDistrictFilterCounts } from '@/lib/catalogFilterCounts';
import { supabase } from '@/lib/supabase';

type Props = {
  browsePath?: string;
  catalogFilters: CatalogFilterState;
  maxPriceLimit: number;
  selectedDistrict?: string;
  onDistrictPick?: (districtId: string) => void;
  className?: string;
};

/** RobeoBP — kerület-felfedező rács találatszámmal. */
export default function DistrictDiscoveryRail({
  browsePath = '/browse',
  catalogFilters,
  maxPriceLimit,
  selectedDistrict = 'all',
  onDistrictPick,
  className,
}: Props) {
  const { t } = useTranslation();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const ids = BUDAPEST_DISTRICTS.map((d) => d.id);
    const baseFilters = { ...catalogFilters, budapest_district: 'all' as const };
    void fetchDistrictFilterCounts(supabase, baseFilters, ids).then((map) => {
      if (!cancelled) {
        setCounts(map);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [catalogFilters]);

  const districtHref = (id: string) =>
    `${catalogUrlFromFilters(
      { ...catalogFilters, budapest_district: id },
      maxPriceLimit,
      browsePath,
    )}#catalog`;

  return (
    <section className={cn('rounded-xl border border-[#007782]/15 bg-[#007782]/5 p-3', className)}>
      <div className="mb-2 flex items-center gap-2">
        <MapPin size={16} className="text-[#007782] shrink-0" aria-hidden />
        <h3 className="text-sm font-bold text-gray-900">{t('bp.discovery.districtTitle')}</h3>
      </div>
      <p className="text-[11px] text-gray-600 mb-3">{t('bp.discovery.districtHint')}</p>
      <div className="flex flex-wrap gap-1.5">
        {BUDAPEST_DISTRICTS.map((d) => {
          const active = selectedDistrict === d.id;
          const count = counts[d.id];
          const inner = (
            <>
              <span>{d.short}</span>
              {!loading && typeof count === 'number' ? (
                <span className="ml-1 tabular-nums text-[10px] opacity-80">({count})</span>
              ) : null}
            </>
          );

          if (onDistrictPick) {
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => onDistrictPick(d.id)}
                className={cn(
                  'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                  active
                    ? 'border-[#007782] bg-[#007782] text-white'
                    : 'border-[#007782]/30 bg-white text-[#007782] hover:bg-[#007782]/10',
                )}
              >
                {inner}
              </button>
            );
          }

          return (
            <Link
              key={d.id}
              href={districtHref(d.id)}
              className={cn(
                'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                active
                  ? 'border-[#007782] bg-[#007782] text-white'
                  : 'border-[#007782]/30 bg-white text-[#007782] hover:bg-[#007782]/10',
              )}
            >
              {inner}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
