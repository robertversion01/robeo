'use client';

import { SlidersHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useImmersiveBrowse } from '@/context/ImmersiveBrowseContext';
import { cn } from '@/lib/utils';

/** Lebegő „szűrők” gomb, ha a chrome el van rejtve scroll közben */
export default function ImmersiveBrowseChrome() {
  const { t } = useTranslation();
  const { enabled, catalogChromeHidden, revealChrome } = useImmersiveBrowse();

  if (!enabled || !catalogChromeHidden) return null;

  return (
    <button
      type="button"
      onClick={revealChrome}
      className={cn(
        'fixed z-[9975] flex items-center gap-1.5 rounded-full border border-gray-200/90 bg-white/90 px-3 py-2 text-xs font-semibold text-gray-800 shadow-lg backdrop-blur-md',
        'bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] right-3',
        'md:bottom-6 md:right-6',
        'transition-all duration-300 ease-out animate-in fade-in slide-in-from-bottom-2',
      )}
      aria-label={t('browse.immersive.showFilters')}
    >
      <SlidersHorizontal size={16} className="text-[#007782]" />
      {t('browse.immersive.showFilters')}
    </button>
  );
}
