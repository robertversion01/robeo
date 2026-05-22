'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useImmersiveBrowse } from '@/context/ImmersiveBrowseContext';
import Filters from '@/components/product/Filters';
import type { CatalogFilterState } from '@/lib/catalogFilters';

type Props = {
  filtersProps: React.ComponentProps<typeof Filters>;
  catalogFilters: CatalogFilterState;
  activeFilterCount?: number;
  onApply: () => void;
};

export default function ImmersiveFilterSheet({
  filtersProps,
  catalogFilters,
  activeFilterCount = 0,
  onApply,
}: Props) {
  const { t } = useTranslation();
  const { filterSheetOpen, closeFilterSheet } = useImmersiveBrowse();

  const searchActive = catalogFilters.search.trim().length > 0;
  const sortActive = catalogFilters.sort !== 'newest';
  const totalActive = activeFilterCount + (searchActive ? 1 : 0) + (sortActive ? 1 : 0);

  useEffect(() => {
    if (!filterSheetOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [filterSheetOpen]);

  if (!filterSheetOpen) return null;

  return (
    <div className="fixed inset-0 z-[9985] md:hidden" role="dialog" aria-modal>
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        aria-label={t('common.close')}
        onClick={closeFilterSheet}
      />
      <div className="absolute bottom-0 left-0 right-0 max-h-[88dvh] rounded-t-2xl bg-white shadow-2xl flex flex-col pb-[env(safe-area-inset-bottom,0px)]">
        <div className="flex justify-center pt-2 pb-1 shrink-0" aria-hidden>
          <div className="h-1 w-10 rounded-full bg-gray-300" />
        </div>
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2.5 shrink-0">
          <div>
            <h2 className="font-bold text-gray-900">{t('browse.immersive.filterSheetTitle')}</h2>
            {totalActive > 0 ? (
              <p className="text-[11px] text-gray-500 mt-0.5">
                {t('browse.immersive.activeFilters', { count: totalActive })}
              </p>
            ) : null}
          </div>
          <button type="button" onClick={closeFilterSheet} className="p-2 rounded-full hover:bg-gray-100 min-h-11 min-w-11">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <Filters {...filtersProps} />
        </div>
        <div className="shrink-0 border-t border-gray-200 p-4">
          <button
            type="button"
            onClick={() => {
              onApply();
              closeFilterSheet();
            }}
            className="w-full btn-base btn-primary min-h-12"
          >
            {totalActive > 0
              ? `${t('browse.immersive.applyFilters')} (${totalActive})`
              : t('browse.immersive.applyFilters')}
          </button>
        </div>
      </div>
    </div>
  );
}
