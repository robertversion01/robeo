'use client';

import { useCallback, useEffect, useState } from 'react';
import { MapPin, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  FOXPOST_APT_FINDER_URL,
  foxpostTerminalAddress,
  foxpostTerminalId,
  foxpostTerminalLabel,
  isFoxpostAptFinderOrigin,
  parseFoxpostTerminalMessage,
  type FoxpostTerminal,
} from '@/lib/foxpostTerminal';

type Props = {
  value: FoxpostTerminal | null;
  onChange: (terminal: FoxpostTerminal | null) => void;
};

export default function FoxpostTerminalPicker({ value, onChange }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const onMessage = useCallback(
    (event: MessageEvent) => {
      if (!isFoxpostAptFinderOrigin(event.origin)) return;
      const terminal = parseFoxpostTerminalMessage(event.data);
      if (!terminal) return;
      onChange(terminal);
      setOpen(false);
    },
    [onChange],
  );

  useEffect(() => {
    if (!open) return;
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [open, onMessage]);

  return (
    <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50/60 p-3">
      <p className="text-xs font-semibold text-orange-900 mb-2">{t('checkout.foxpost.title')}</p>

      {value ? (
        <div className="rounded-lg border border-orange-300/80 bg-[#1a2328] p-3 text-sm">
          <p className="font-semibold text-[#e7edf0]">{foxpostTerminalLabel(value)}</p>
          <p className="text-[#8fa3ad] text-xs mt-1">{foxpostTerminalAddress(value)}</p>
          <p className="text-[10px] text-[#6b7d85] mt-1 font-mono">
            {t('checkout.foxpost.terminalId', { id: foxpostTerminalId(value) })}
          </p>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="mt-2 text-xs text-[#007782] font-semibold hover:underline"
          >
            {t('checkout.foxpost.changeTerminal')}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#e85d04] hover:bg-[#d45303] text-white font-semibold py-3 text-sm transition-colors"
        >
          <MapPin size={18} />
          {t('checkout.foxpost.openMap')}
        </button>
      )}

      {open ? (
        <div
          className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/50 p-2 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t('checkout.foxpost.mapAria')}
        >
          <div className="relative w-full max-w-5xl h-[85vh] bg-[#1a2328] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a3941] shrink-0">
              <h3 className="font-bold text-[#e7edf0]">{t('checkout.foxpost.mapTitle')}</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-2 rounded-full hover:bg-[#243038]"
                aria-label={t('checkout.foxpost.close')}
              >
                <X size={20} />
              </button>
            </div>
            <iframe
              title={t('checkout.foxpost.mapAria')}
              src={FOXPOST_APT_FINDER_URL}
              className="flex-1 w-full border-0"
              allow="geolocation"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
