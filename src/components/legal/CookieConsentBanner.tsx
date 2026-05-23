'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  COOKIE_CONSENT_STORAGE_KEY,
  type CookieConsentPrefs,
} from '@/lib/legalConstants';

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
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const existing = loadConsent();
    if (!existing) setVisible(true);
  }, []);

  const accept = (prefs: Omit<CookieConsentPrefs, 'acceptedAt'>) => {
    saveConsent({ ...prefs, acceptedAt: new Date().toISOString() });
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Süti beállítások"
      className="fixed bottom-0 left-0 right-0 z-[100] p-3 md:p-4 pointer-events-none"
    >
      <div className="pointer-events-auto mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white/95 backdrop-blur-md shadow-xl p-4 md:p-5">
        <p className="text-sm font-semibold text-gray-900 mb-1">Sütik és adatvédelem</p>
        <p className="text-xs text-gray-600 leading-relaxed mb-3">
          A ROBEO demó módban működik. A szükséges sütik a működéshez kellenek; az analitika és
          marketing sütik opcionálisak.           Részletek:{' '}
          <Link href="/legal/cookies" className="text-[#007782] font-semibold hover:underline">
            Cookie szabályzat
          </Link>
          {' · '}
          <Link href="/legal/privacy" className="text-[#007782] font-semibold hover:underline">
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
            onClick={() =>
              accept({ necessary: true, analytics: true, marketing: true })
            }
            className="h-9 rounded-lg bg-[#007782] px-4 text-xs font-semibold text-white hover:bg-[#00616b]"
          >
            Összes elfogadása
          </button>
          <button
            type="button"
            onClick={() =>
              accept({ necessary: true, analytics: false, marketing: false })
            }
            className="h-9 rounded-lg border border-gray-300 bg-white px-4 text-xs font-semibold text-gray-800 hover:bg-gray-50"
          >
            Csak szükséges
          </button>
          <button
            type="button"
            onClick={() =>
              accept({ necessary: true, analytics, marketing })
            }
            className="h-9 rounded-lg border border-[#007782]/30 px-4 text-xs font-semibold text-[#007782] hover:bg-[#007782]/5"
          >
            Mentés
          </button>
          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            className="h-9 px-2 text-xs text-gray-500 hover:text-gray-800 underline"
          >
            {showDetails ? 'Bezárás' : 'Testreszabás'}
          </button>
        </div>
      </div>
    </div>
  );
}
