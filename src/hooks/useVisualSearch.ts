'use client';

import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { fileToBase64, postVisualSearch } from '@/lib/visualSearchClient';
import type { ProductTypeaheadRow } from '@/lib/listedProducts';

type Options = {
  onQuery?: (query: string) => void;
  onResults?: (products: ProductTypeaheadRow[]) => void;
  onComplete?: () => void;
};

export function useVisualSearch({ onQuery, onResults, onComplete }: Options = {}) {
  const { t } = useTranslation();
  const [visualLoading, setVisualLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const runVisualSearch = useCallback(
    async (file: File) => {
      if (visualLoading) return;
      setVisualLoading(true);
      try {
        const imageBase64 = await fileToBase64(file);
        const { ok, data } = await postVisualSearch(imageBase64);

        if (!ok) {
          if (data.error === 'ollama_unreachable') {
            toast.error(t('browse.search.visualOffline'));
          } else {
            toast.error(t('browse.search.visualFailed'));
          }
          return;
        }

        const query = data.query?.trim() || '';
        if (query) onQuery?.(query);
        if (data.products?.length) onResults?.(data.products);
        toast.success(t('browse.search.visualDone', { query: query || '—' }));
        onComplete?.();
      } catch {
        toast.error(t('browse.search.visualFailed'));
      } finally {
        setVisualLoading(false);
      }
    },
    [visualLoading, onQuery, onResults, onComplete, t],
  );

  const onFileChange = useCallback(
    (file: File | undefined) => {
      if (file) void runVisualSearch(file);
    },
    [runVisualSearch],
  );

  return {
    visualLoading,
    fileInputRef,
    openFilePicker,
    runVisualSearch,
    onFileChange,
  };
}
