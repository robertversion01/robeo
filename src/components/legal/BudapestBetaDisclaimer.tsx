'use client';

/**
 * RobeoBP — felelosseg-kizarasi disclaimer (jogi szafty).
 *
 * Csak akkor renderel, ha `ROBEO_BP_MODE` aktiv. A V1 build-ben NEM jelenik meg
 * (NO DELETION rule — semmilyen V1 jogi szoveget vagy kompongenst nem
 * modositunk, ez egy uj, kulonallo blokk).
 *
 * Hasznald: checkout summary aljara, auth (regisztracio/login) kartya ala,
 * vagy barhol ahol a felhasznalo donteset megelozoen erdemes vizualizalni
 * a jogi nyilatkozatot.
 */

import { useTranslation } from 'react-i18next';
import { ROBEO_BP_MODE } from '@/lib/features';

type Variant = 'card' | 'inline' | 'dark';

export default function BudapestBetaDisclaimer({
  variant = 'card',
  className = '',
}: {
  variant?: Variant;
  className?: string;
}) {
  const { t } = useTranslation();
  if (!ROBEO_BP_MODE) return null;

  const wrapperClass =
    variant === 'dark'
      ? 'mt-4 rounded-xl border border-amber-700/40 bg-amber-950/400/10 px-3 py-2.5 text-xs text-amber-100'
      : variant === 'inline'
        ? 'mt-3 rounded-lg border border-amber-900/45 bg-amber-950/40 px-3 py-2 text-[11px] text-amber-200'
        : 'mt-4 rounded-xl border border-amber-900/45 bg-amber-950/40 px-3 py-2.5 text-xs text-amber-200';

  const titleClass =
    variant === 'dark'
      ? 'font-semibold text-amber-200'
      : 'font-semibold text-amber-200';

  return (
    <div className={`${wrapperClass} ${className}`} role="note">
      <p className={titleClass}>{t('checkout.localPickup.disclaimerTitle')}</p>
      <p className="mt-1 leading-snug">{t('checkout.localPickup.disclaimerBody')}</p>
    </div>
  );
}
