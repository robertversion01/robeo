'use client';

import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { isMobileViewport, runWhenIdle } from '@/lib/mobilePerf';

const CLIENT_BUILD_ID = process.env.NEXT_PUBLIC_APP_BUILD_ID ?? 'development';

async function fetchServerBuildId(): Promise<string | null> {
  try {
    const res = await fetch('/api/app-version', {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { buildId?: string };
    return data.buildId?.trim() || null;
  } catch {
    return null;
  }
}

function reloadWithoutCache() {
  const url = new URL(window.location.href);
  url.searchParams.set('_robeo', String(Date.now()));
  window.location.replace(url.toString());
}

async function unregisterServiceWorkers() {
  if (!('serviceWorker' in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((r) => r.unregister()));
}

/** Bundle vs szerver build — régi JS mellett is működik. */
export default function DeployRefreshNotifier() {
  const { t } = useTranslation();
  const promptedRef = useRef(false);

  const checkForUpdate = useCallback(async () => {
    const serverBuildId = await fetchServerBuildId();
    if (!serverBuildId || serverBuildId === 'development') return;

    const htmlBuildId =
      document.querySelector('meta[name="robeo-build"]')?.getAttribute('content')?.trim() ?? null;

    const staleBundle = CLIENT_BUILD_ID !== 'development' && CLIENT_BUILD_ID !== serverBuildId;
    const staleHtml = Boolean(htmlBuildId && htmlBuildId !== serverBuildId);

    if (!staleBundle && !staleHtml) {
      window.localStorage.setItem('robeo_server_build', serverBuildId);
      return;
    }

    if (promptedRef.current) return;
    promptedRef.current = true;

    toast(t('app.updateAvailable'), {
      duration: Infinity,
      action: {
        label: t('app.reload'),
        onClick: () => {
          void (async () => {
            window.localStorage.setItem('robeo_server_build', serverBuildId);
            await unregisterServiceWorkers();
            reloadWithoutCache();
          })();
        },
      },
    });
  }, [t]);

  useEffect(() => {
    const boot = () => void checkForUpdate();
    const bootDelay = isMobileViewport() ? 10_000 : 1500;
    const timer = window.setTimeout(() => {
      if (isMobileViewport()) {
        runWhenIdle(boot, 5000);
      } else {
        boot();
      }
    }, bootDelay);

    const onVisible = () => {
      if (document.visibilityState === 'visible') void checkForUpdate();
    };
    document.addEventListener('visibilitychange', onVisible);
    const interval = window.setInterval(() => void checkForUpdate(), 60_000);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(interval);
    };
  }, [checkForUpdate]);

  return null;
}
