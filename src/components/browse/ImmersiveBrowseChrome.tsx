'use client';

import { SlidersHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useImmersiveBrowse } from '@/context/ImmersiveBrowseContext';
import { cn } from '@/lib/utils';

/** Lebegő „szűrők” gomb — fixed, nem tolja a layoutot. */
export default function ImmersiveBrowseChrome() {
  const { t } = useTranslation();
  const { enabled, catalogChromeHidden, openFilterSheet } = useImmersiveBrowse();

  const visible = enabled && catalogChromeHidden;

  return (
    <button
      type="button"
      onClick={openFilterSheet}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className={cn(
        'fixed z-[9975] flex items-center gap-1.5 rounded-full border border-gray-200/90 bg-white/90 px-3 py-2 text-xs font-semibold text-gray-800 shadow-lg backdrop-blur-md',
        'bottom-[calc(4rem+1rem+env(safe-area-inset-bottom,0px))] right-3',
        'md:bottom-6 md:right-6',
        'transition-[opacity,transform] duration-300 ease-out',
        visible
          ? 'pointer-events-auto translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-2 opacity-0',
      )}
      aria-label={t('browse.immersive.showFilters')}
    >
      <SlidersHorizontal size={16} className="text-[#007782]" />
      {t('browse.immersive.showFilters')}
    </button>
  );
}
