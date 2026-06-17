'use client';

import Link from 'next/link';
import { X, MessageCircle } from 'lucide-react';
import type { IncomingOfferAlert } from '@/context/NotificationContext';

type Props = {
  alert: IncomingOfferAlert | null;
  onDismiss: () => void;
};

export default function OfferNotificationPopup({ alert, onDismiss }: Props) {
  if (!alert) return null;

  return (
    <div
      role="alertdialog"
      aria-live="assertive"
      aria-labelledby="offer-alert-title"
      className="fixed left-3 right-3 z-[12000] mx-auto max-w-md rounded-2xl border border-[#007782]/30 bg-[#1a2328] p-4 shadow-2xl top-[calc(3rem+env(safe-area-inset-top,0px))] md:left-auto md:right-4 md:top-16"
    >
      <button
        type="button"
        onClick={onDismiss}
        className="absolute right-2 top-2 rounded-full p-1.5 text-[#6b7d85] hover:bg-[#243038] hover:text-[#b2c0c6]"
        aria-label="Bezárás"
      >
        <X size={18} />
      </button>

      <p className="text-xs font-semibold uppercase tracking-wide text-[#007782]">Új ajánlat</p>
      <h2 id="offer-alert-title" className="mt-1 pr-8 text-base font-bold text-[#e7edf0] leading-snug">
        Új ajánlat érkezett a „{alert.productName}” termékedre:{' '}
        <span className="text-[#007782] tabular-nums">
          {alert.amountHuf.toLocaleString('hu-HU')} Ft
        </span>
        !
      </h2>

      <div className="mt-4 flex gap-2">
        <Link
          href="/messages"
          onClick={onDismiss}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#007782] px-3 py-2.5 text-sm font-semibold text-white hover:bg-[#006670]"
        >
          <MessageCircle size={16} />
          Üzenetek
        </Link>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-xl border border-[#2a3941] px-3 py-2.5 text-sm font-medium text-[#b2c0c6] hover:bg-[#1f2a30]"
        >
          Később
        </button>
      </div>
    </div>
  );
}
