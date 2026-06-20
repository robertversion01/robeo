'use client';

import { Camera, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useVisualSearch } from '@/hooks/useVisualSearch';
import type { ProductTypeaheadRow } from '@/lib/listedProducts';

type Props = {
  onQuery?: (query: string) => void;
  onResults?: (products: ProductTypeaheadRow[]) => void;
  onComplete?: () => void;
  className?: string;
};

/** Vinted-szerű külön belépési pont — kép alapú keresés a szöveges kereső alatt. */
export default function VisualSearchCta({
  onQuery,
  onResults,
  onComplete,
  className,
}: Props) {
  const { t } = useTranslation();
  const { visualLoading, fileInputRef, openFilePicker, onFileChange } = useVisualSearch({
    onQuery,
    onResults,
    onComplete,
  });

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          onFileChange(file);
        }}
      />
      <button
        type="button"
        onClick={openFilePicker}
        disabled={visualLoading}
        className={cn(
          'flex w-full items-center gap-2.5 rounded-xl border border-[#2a3941] bg-[#141d21] px-3 py-2.5 text-left touch-manipulation',
          'hover:border-[#38c7d0]/35 active:bg-[#172228] disabled:opacity-60',
          className,
        )}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#007782]/15 text-[#38c7d0]">
          {visualLoading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Camera size={18} />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold text-[#e7edf0]">
            {t('browse.search.visualCta')}
          </span>
          <span className="block text-[10px] leading-snug text-[#8fa3ad] mt-0.5">
            {t('browse.search.visualCtaHint')}
          </span>
        </span>
      </button>
    </>
  );
}
