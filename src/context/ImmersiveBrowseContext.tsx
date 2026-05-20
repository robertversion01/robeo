'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import { isImmersiveBrowsePath } from '@/lib/navVisibility';

const SCROLL_DOWN_THRESHOLD = 6;
const SCROLL_UP_THRESHOLD = 4;
const TOP_REVEAL_Y = 40;

type ImmersiveBrowseContextValue = {
  /** Immersive mód aktív ezen az oldalon */
  enabled: boolean;
  /** Chrome (nav, szűrők, hero) rejtve scroll közben */
  chromeHidden: boolean;
  /** Mobil nézet — nav/tab bar is rejtődik */
  isMobile: boolean;
  /** Szűrő/fejléc blokk rejtve (mobil + desktop) */
  catalogChromeHidden: boolean;
  /** Nav/tab bar rejtve (főleg mobil) */
  shellChromeHidden: boolean;
  revealChrome: () => void;
  filterSheetOpen: boolean;
  openFilterSheet: () => void;
  closeFilterSheet: () => void;
};

const ImmersiveBrowseContext = createContext<ImmersiveBrowseContextValue>({
  enabled: false,
  chromeHidden: false,
  isMobile: false,
  catalogChromeHidden: false,
  shellChromeHidden: false,
  revealChrome: () => {},
  filterSheetOpen: false,
  openFilterSheet: () => {},
  closeFilterSheet: () => {},
});

export function useImmersiveBrowse() {
  return useContext(ImmersiveBrowseContext);
}

type ProviderProps = {
  children: ReactNode;
  loggedIn: boolean;
};

export function ImmersiveBrowseProvider({ children, loggedIn }: ProviderProps) {
  const pathname = usePathname();
  const enabled = isImmersiveBrowsePath(pathname, loggedIn);
  const [chromeHidden, setChromeHidden] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const lastYRef = useRef(0);
  const tickingRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setChromeHidden(false);
      lastYRef.current = 0;
      return;
    }

    lastYRef.current = window.scrollY;

    const onScroll = () => {
      if (tickingRef.current) return;
      tickingRef.current = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const dy = y - lastYRef.current;

        if (y <= TOP_REVEAL_Y) {
          setChromeHidden(false);
        } else if (dy > SCROLL_DOWN_THRESHOLD) {
          setChromeHidden(true);
        } else if (dy < -SCROLL_UP_THRESHOLD) {
          setChromeHidden(false);
        }

        lastYRef.current = y;
        tickingRef.current = false;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [enabled, pathname]);

  const revealChrome = useCallback(() => {
    setChromeHidden(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const openFilterSheet = useCallback(() => {
    setFilterSheetOpen(true);
    setChromeHidden(false);
  }, []);

  const closeFilterSheet = useCallback(() => {
    setFilterSheetOpen(false);
  }, []);

  const value = useMemo<ImmersiveBrowseContextValue>(() => {
    const catalogChromeHidden = enabled && chromeHidden;
    const shellChromeHidden = enabled && chromeHidden && isMobile;
    return {
      enabled,
      chromeHidden,
      isMobile,
      catalogChromeHidden,
      shellChromeHidden,
      revealChrome,
      filterSheetOpen,
      openFilterSheet,
      closeFilterSheet,
    };
  }, [
    enabled,
    chromeHidden,
    isMobile,
    revealChrome,
    filterSheetOpen,
    openFilterSheet,
    closeFilterSheet,
  ]);

  return (
    <ImmersiveBrowseContext.Provider value={value}>{children}</ImmersiveBrowseContext.Provider>
  );
}
