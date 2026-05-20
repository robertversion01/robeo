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
        className="absolute inset-0 bg-black/40"
        aria-label={t('common.close')}
        onClick={closeFilterSheet}
      />
      <div className="absolute bottom-0 left-0 right-0 max-h-[85dvh] rounded-t-2xl bg-white shadow-2xl flex flex-col pb-[env(safe-area-inset-bottom,0px)]">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 shrink-0">
          <h2 className="font-bold text-gray-900">{t('browse.immersive.filterSheetTitle')}</h2>
          <button type="button" onClick={closeFilterSheet} className="p-2 rounded-full hover:bg-gray-100">
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
            {activeFilterCount > 0
              ? `${t('browse.immersive.applyFilters')} (${activeFilterCount})`
              : t('browse.immersive.applyFilters')}
          </button>
        </div>
      </div>
    </div>
  );
}
