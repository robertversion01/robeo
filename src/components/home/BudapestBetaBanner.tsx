'use client';

/**
 * RobeoBP marketing alert banner.
 *
 * - Csak NEXT_PUBLIC_ROBEO_MODE=bp módban renderelődik (build-time gate).
 * - Két variáns:
 *     overlay  → fullScreen hero felett, GuestLandingHeader alá csúsztatva
 *     inline   → normál, dokumentum-folyamú banner (compact hero felett)
 * - Mobile-first: vibráló háttér, jól olvasható nagy szöveg.
 */

import { ROBEO_BP_MODE } from '@/lib/features';

type Variant = 'overlay' | 'inline';

const HUNGARIAN_TEXT = 'Budapest Béta Teszt — Ingyenes, készpénzes és személyes átvétel!';

export default function BudapestBetaBanner({ variant }: { variant: Variant }) {
  if (!ROBEO_BP_MODE) return null;

  if (variant === 'overlay') {
    return (
      <div
        className="pointer-events-none absolute inset-x-0 top-[2.85rem] z-[15] flex justify-center px-2 sm:px-4"
        role="status"
        aria-live="polite"
      >
        <div className="pointer-events-auto w-full max-w-2xl rounded-xl border border-amber-300/40 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 px-4 py-2 text-center shadow-lg ring-1 ring-amber-500/30 backdrop-blur-sm">
          <p className="text-[13px] font-bold leading-snug text-amber-950 sm:text-sm">
            {HUNGARIAN_TEXT}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="mb-2 rounded-xl border border-amber-300 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 px-4 py-2.5 text-center shadow-sm"
      role="status"
      aria-live="polite"
    >
      <p className="text-[13px] font-bold leading-snug text-amber-950 sm:text-sm">
        {HUNGARIAN_TEXT}
      </p>
    </div>
  );
}
