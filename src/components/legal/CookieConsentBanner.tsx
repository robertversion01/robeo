'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  COOKIE_CONSENT_STORAGE_KEY,
  type CookieConsentPrefs,
} from '@/lib/legalConstants';
import { MOBILE_BOTTOM_NAV_INNER } from '@/lib/layoutTokens';
import { shouldShowMobileBottomNav } from '@/lib/navVisibility';
import { cn } from '@/lib/utils';

function loadConsent(): CookieConsentPrefs | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CookieConsentPrefs;
  } catch {
    return null;
  }
}

function saveConsent(prefs: CookieConsentPrefs) {
  localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(prefs));
}

export default function CookieConsentBanner() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const existing = loadConsent();
    if (!existing) setVisible(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (!cancelled) setLoggedIn(!!user);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session?.user);
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const accept = (prefs: Omit<CookieConsentPrefs, 'acceptedAt'>) => {
    saveConsent({ ...prefs, acceptedAt: new Date().toISOString() });
    setVisible(false);
  };

  if (!visible) return null;

  const aboveMobileTabBar = shouldShowMobileBottomNav(pathname, loggedIn);

  return (
    <div
      role="dialog"
      aria-label="Süti beállítások"
      className={cn(
        'pointer-events-none fixed left-0 right-0 z-[9990] p-3 md:bottom-0 md:p-4',
        !aboveMobileTabBar && 'bottom-0 pb-[env(safe-area-inset-bottom,0px)]',
      )}
      style={
        aboveMobileTabBar
          ? { bottom: `calc(${MOBILE_BOTTOM_NAV_INNER} + env(safe-area-inset-bottom, 0px))` }
          : undefined
      }
    >
      <div className="pointer-events-auto mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white/95 p-4 shadow-xl backdrop-blur-md md:p-5">
        <p className="mb-1 text-sm font-semibold text-gray-900">Sütik és adatvédelem</p>
        <p className="mb-3 text-xs leading-relaxed text-gray-600">
          A ROBEO demó módban működik. A szükséges sütik a működéshez kellenek; az analitika és
          marketing sütik opcionálisak. Részletek:{' '}
          <Link href="/legal/cookies" className="font-semibold text-[#007782] hover:underline">
            Cookie szabályzat
          </Link>
          {' · '}
          <Link href="/legal/privacy" className="font-semibold text-[#007782] hover:underline">
            Adatvédelem
          </Link>
          .
        </p>

        {showDetails ? (
          <div className="mb-3 space-y-2 rounded-lg border border-gray-100 bg-gray-50/80 p-3 text-xs">
            <label className="flex items-center justify-between gap-2 text-gray-500">
              <span>Szükséges (mindig aktív)</span>
              <input type="checkbox" checked disabled className="accent-[#007782]" />
            </label>
            <label className="flex items-center justify-between gap-2 text-gray-800">
              <span>Analitika (demó)</span>
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
                className="accent-[#007782]"
              />
            </label>
            <label className="flex items-center justify-between gap-2 text-gray-800">
              <span>Marketing (demó)</span>
              <input
                type="checkbox"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
                className="accent-[#007782]"
              />
            </label>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => accept({ necessary: true, analytics: true, marketing: true })}
            className="h-9 rounded-lg bg-[#007782] px-4 text-xs font-semibold text-white hover:bg-[#00616b]"
          >
            Összes elfogadása
          </button>
          <button
            type="button"
            onClick={() => accept({ necessary: true, analytics: false, marketing: false })}
            className="h-9 rounded-lg border border-gray-300 bg-white px-4 text-xs font-semibold text-gray-800 hover:bg-gray-50"
          >
            Csak szükséges
          </button>
          <button
            type="button"
            onClick={() => accept({ necessary: true, analytics, marketing })}
            className="h-9 rounded-lg border border-[#007782]/30 px-4 text-xs font-semibold text-[#007782] hover:bg-[#007782]/5"
          >
            Mentés
          </button>
          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            className="h-9 px-2 text-xs text-gray-500 underline hover:text-gray-800"
          >
            {showDetails ? 'Bezárás' : 'Testreszabás'}
          </button>
        </div>
      </div>
    </div>
  );
}
