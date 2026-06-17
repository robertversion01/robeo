'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { BUDAPEST_DISTRICTS, getDistrictLabel } from '@/lib/budapestDistricts';
import { catalogUrlFromFilters } from '@/lib/catalogUrlParams';
import type { CatalogFilterState } from '@/lib/catalogFilters';
import { fetchDistrictFilterCounts } from '@/lib/catalogFilterCounts';
import { supabase } from '@/lib/supabase';
import BudapestDistrictGrid from '@/components/browse/BudapestDistrictGrid';

type Props = {
  browsePath?: string;
  catalogFilters: CatalogFilterState;
  maxPriceLimit: number;
  selectedDistrict?: string;
  onDistrictPick?: (districtId: string) => void;
  className?: string;
  /** Mobilon alapból összecsukva, ha nincs aktív kerület. */
  collapsible?: boolean;
};

/** RobeoBP — kerület-felfedező rács találatszámmal. */
export default function DistrictDiscoveryRail({
  browsePath = '/browse',
  catalogFilters,
  maxPriceLimit,
  selectedDistrict = 'all',
  onDistrictPick,
  className,
  collapsible = false,
}: Props) {
  const { t } = useTranslation();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const hasActiveDistrict = Boolean(selectedDistrict && selectedDistrict !== 'all');
  const [expanded, setExpanded] = useState(!collapsible || hasActiveDistrict);

  useEffect(() => {
    if (hasActiveDistrict) setExpanded(true);
  }, [hasActiveDistrict]);

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

  const activeLabel = hasActiveDistrict ? getDistrictLabel(selectedDistrict) : null;

  return (
    <section className={cn('rounded-xl border border-[#2a3941] bg-[#141d21] p-3', className)}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-[#38c7d0] shrink-0" aria-hidden />
            <h3 className="text-sm font-bold text-[#e7edf0]">{t('bp.discovery.districtTitle')}</h3>
          </div>
          <p className="mt-1 text-xs text-[#8fa3ad]">{t('bp.discovery.districtHint')}</p>
        </div>
        {collapsible ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#2a3941] bg-[#1a2328] px-2.5 py-1.5 text-[11px] font-semibold text-[#38c7d0] touch-manipulation"
            aria-expanded={expanded}
          >
            {activeLabel ?? t('browse.filters.district')}
            <ChevronDown size={14} className={cn('transition-transform', expanded && 'rotate-180')} />
          </button>
        ) : null}
      </div>

      {!collapsible || expanded ? (
        <BudapestDistrictGrid
          selectedDistrict={selectedDistrict}
          counts={counts}
          loadingCounts={loading}
          onDistrictPick={onDistrictPick}
          districtHref={onDistrictPick ? undefined : districtHref}
          allLabel={t('browse.filters.allDistricts')}
        />
      ) : null}
    </section>
  );
}
