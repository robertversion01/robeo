'use client';

import Link from 'next/link';
import { X, PartyPopper, ExternalLink, MessageCircle, Truck } from 'lucide-react';
import type { IncomingSaleAlert } from '@/lib/saleNotifications';
import { isUuid } from '@/lib/validators';

type Props = {
  alert: IncomingSaleAlert | null;
  onDismiss: () => void;
};

export default function SaleNotificationPopup({ alert, onDismiss }: Props) {
  if (!alert) return null;

  const hasProduct = Boolean(alert.productId && isUuid(alert.productId));
  const productHref = hasProduct ? `/products/${alert.productId}` : null;
  const messagesHref = alert.buyerId
    ? `/messages?with=${encodeURIComponent(alert.buyerId)}`
    : '/messages';
  const profileHref = '/profile?tab=selling';

  return (
    <div
      role="alertdialog"
      aria-live="assertive"
      aria-labelledby="sale-alert-title"
      className="fixed left-3 right-3 z-[12001] mx-auto max-w-md rounded-2xl border border-emerald-500/40 bg-[#1a2328] p-4 shadow-2xl top-[calc(3rem+env(safe-area-inset-top,0px))] md:left-auto md:right-4 md:top-16"
    >
      <button
        type="button"
        onClick={onDismiss}
        className="absolute right-2 top-2 rounded-full p-1.5 text-[#6b7d85] hover:bg-[#243038] hover:text-[#b2c0c6]"
        aria-label="Bezárás"
      >
        <X size={18} />
      </button>

      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 flex items-center gap-1">
        <PartyPopper size={14} />
        Sikeres eladás
      </p>
      <h2 id="sale-alert-title" className="mt-1 pr-8 text-base font-bold text-[#e7edf0] leading-snug">
        Gratulálunk! Eladtad a következőt:{' '}
        {productHref ? (
          <Link
            href={productHref}
            onClick={onDismiss}
            className="text-[#007782] underline underline-offset-2 hover:text-[#006670]"
          >
            {alert.productName}
          </Link>
        ) : (
          <span className="text-[#007782]">{alert.productName}</span>
        )}
        !
      </h2>

      <ul className="mt-3 space-y-2 text-sm text-[#b2c0c6]">
        <li>
          <Link
            href={messagesHref}
            onClick={onDismiss}
            className="font-semibold text-[#007782] underline underline-offset-2 hover:text-[#006670]"
          >
            1. Foxpost címke letöltése (üzenetek) →
          </Link>
        </li>
        <li>
          <Link
            href={profileHref}
            onClick={onDismiss}
            className="inline-flex items-center gap-1 font-semibold text-[#007782] underline underline-offset-2 hover:text-[#006670]"
          >
            <Truck size={14} />
            2. Csomag feladva jelzése (profil / Eladásaim) →
          </Link>
        </li>
      </ul>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Link
          href={messagesHref}
          onClick={onDismiss}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#007782] px-3 py-2.5 text-sm font-semibold text-white hover:bg-[#006670] min-w-[8rem]"
        >
          <MessageCircle size={16} />
          Címke & chat
        </Link>
        <Link
          href={profileHref}
          onClick={onDismiss}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#007782] bg-[#1a2328] px-3 py-2.5 text-sm font-semibold text-[#007782] hover:bg-[#007782]/5 min-w-[8rem]"
        >
          <Truck size={16} />
          Csomag feladva
        </Link>
        {productHref ? (
          <Link
            href={productHref}
            onClick={onDismiss}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-[#2a3941] px-3 py-2.5 text-sm font-medium text-[#b2c0c6] hover:bg-[#1f2a30] min-w-[8rem]"
          >
            <ExternalLink size={16} />
            Termék
          </Link>
        ) : null}
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-xl border border-[#2a3941] px-3 py-2.5 text-sm font-medium text-[#b2c0c6] hover:bg-[#1f2a30] sm:flex-none"
        >
          Később
        </button>
      </div>
    </div>
  );
}
