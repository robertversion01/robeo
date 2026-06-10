'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const BUILD_ID = process.env.NEXT_PUBLIC_APP_BUILD_ID ?? 'development';
const STORAGE_KEY = 'robeo_seen_build_id';

/** Új Vercel deploy után jelzi, ha a telefon/böngésző még régi bundle-t futtat. */
export default function DeployRefreshNotifier() {
  const { t } = useTranslation();
  const promptedRef = useRef(false);

  useEffect(() => {
    if (BUILD_ID === 'development') return;

    const seen = window.localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      window.localStorage.setItem(STORAGE_KEY, BUILD_ID);
      return;
    }

    const promptReload = () => {
      if (seen === BUILD_ID || promptedRef.current) return;
      promptedRef.current = true;
      toast(t('app.updateAvailable'), {
        duration: Infinity,
        action: {
          label: t('app.reload'),
          onClick: () => {
            window.localStorage.setItem(STORAGE_KEY, BUILD_ID);
            window.location.reload();
          },
        },
      });
    };

    promptReload();

    const onVisible = () => {
      if (document.visibilityState === 'visible') promptReload();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [t]);

  return null;
}
