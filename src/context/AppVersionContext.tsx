'use client';

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  type AppUiVersion,
  isV2PreviewEnabled,
  readStoredAppVersion,
  writeStoredAppVersion,
} from '@/lib/appVersion';

type AppVersionContextValue = {
  version: AppUiVersion;
  setVersion: (v: AppUiVersion) => void;
  toggleVersion: () => void;
};

const AppVersionContext = createContext<AppVersionContextValue | null>(null);

export function AppVersionProvider({ children }: { children: ReactNode }) {
  // SSR + első kliens paint: mindig v1, hogy egyezzen a szerver HTML-lel (localStorage nincs a szerveren).
  const [version, setVersionState] = useState<AppUiVersion>('v1');

  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- szándékos hidratálás utáni sync localStorage-ból
    setVersionState(readStoredAppVersion());
  }, []);

  const setVersion = useCallback((v: AppUiVersion) => {
    const next = !isV2PreviewEnabled() ? 'v1' : v;
    setVersionState(next);
    writeStoredAppVersion(next);
  }, []);

  const toggleVersion = useCallback(() => {
    if (!isV2PreviewEnabled()) return;
    setVersionState((prev) => {
      const next: AppUiVersion = prev === 'v1' ? 'v2' : 'v1';
      writeStoredAppVersion(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ version, setVersion, toggleVersion }),
    [version, setVersion, toggleVersion],
  );

  return (
    <AppVersionContext.Provider value={value}>{children}</AppVersionContext.Provider>
  );
}

export function useAppVersion(): AppVersionContextValue {
  const ctx = useContext(AppVersionContext);
  if (!ctx) {
    throw new Error('useAppVersion must be used within AppVersionProvider');
  }
  return ctx;
}
