'use client';

import Link from 'next/link';
import { X, PartyPopper, ExternalLink, MessageCircle } from 'lucide-react';
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

  return (
    <div
      role="alertdialog"
      aria-live="assertive"
      aria-labelledby="sale-alert-title"
      className="fixed left-3 right-3 z-[12001] mx-auto max-w-md rounded-2xl border border-emerald-500/40 bg-white p-4 shadow-2xl top-[calc(3rem+env(safe-area-inset-top,0px))] md:left-auto md:right-4 md:top-16"
    >
      <button
        type="button"
        onClick={onDismiss}
        className="absolute right-2 top-2 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
        aria-label="Bezárás"
      >
        <X size={18} />
      </button>

      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 flex items-center gap-1">
        <PartyPopper size={14} />
        Sikeres eladás
      </p>
      <h2 id="sale-alert-title" className="mt-1 pr-8 text-base font-bold text-gray-900 leading-snug">
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
      <p className="mt-2 text-sm text-gray-600">
        Készítsd össze a csomagot, töltsd le a Foxpost címkét az üzenetekben, majd jelöld feladottnak.
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Link
          href={messagesHref}
          onClick={onDismiss}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#007782] px-3 py-2.5 text-sm font-semibold text-white hover:bg-[#006670] min-w-[8rem]"
        >
          <MessageCircle size={16} />
          Üzenetek
        </Link>
        {productHref ? (
          <Link
            href={productHref}
            onClick={onDismiss}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#007782] bg-white px-3 py-2.5 text-sm font-semibold text-[#007782] hover:bg-[#007782]/5 min-w-[8rem]"
          >
            <ExternalLink size={16} />
            Termék megtekintése
          </Link>
        ) : null}
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:flex-none"
        >
          Később
        </button>
      </div>
    </div>
  );
}
