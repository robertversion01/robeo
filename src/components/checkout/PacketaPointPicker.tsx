'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { MapPin, Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  PACKETA_WIDGET_SCRIPT,
  packetaPointAddress,
  packetaPointId,
  packetaPointLabel,
  parsePacketaWidgetPoint,
  searchPacketaPoints,
  type PacketaPoint,
} from '@/lib/packetaPoint';

declare global {
  interface Window {
    Packeta?: {
      Widget: {
        pick: (
          apiKey: string,
          callback: (point: unknown) => void,
          opts?: Record<string, unknown>,
        ) => void;
      };
    };
  }
}

type Props = {
  value: PacketaPoint | null;
  onChange: (point: PacketaPoint | null) => void;
};

export default function PacketaPointPicker({ value, onChange }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const apiKey = process.env.NEXT_PUBLIC_PACKETA_API_KEY?.trim() || '';

  const results = useMemo(() => searchPacketaPoints(query), [query]);

  const openWidget = useCallback(async () => {
    if (!apiKey) {
      setOpen(true);
      return;
    }
    try {
      if (!window.Packeta?.Widget) {
        await new Promise<void>((resolve, reject) => {
          const existing = document.querySelector(`script[src="${PACKETA_WIDGET_SCRIPT}"]`);
          if (existing) {
            resolve();
            return;
          }
          const script = document.createElement('script');
          script.src = PACKETA_WIDGET_SCRIPT;
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Packeta widget load failed'));
          document.body.appendChild(script);
        });
      }
      window.Packeta?.Widget.pick(apiKey, (raw) => {
        const point = parsePacketaWidgetPoint(raw);
        if (point) {
          onChange(point);
          setOpen(false);
        }
      }, { language: 'hu' });
    } catch {
      setOpen(true);
    }
  }, [apiKey, onChange]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  return (
    <div className="mt-3 rounded-xl border border-red-200 bg-red-50/60 p-3">
      <p className="text-xs font-semibold text-red-900 mb-2">{t('checkout.packeta.title')}</p>

      {value ? (
        <div className="rounded-lg border border-red-300/80 bg-white p-3 text-sm">
          <p className="font-semibold text-gray-900">{packetaPointLabel(value)}</p>
          <p className="text-gray-600 text-xs mt-1">{packetaPointAddress(value)}</p>
          <p className="text-[10px] text-gray-400 mt-1 font-mono">
            {t('checkout.packeta.pointId', { id: packetaPointId(value) })}
          </p>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="mt-2 text-xs text-[#007782] font-semibold hover:underline"
          >
            {t('checkout.packeta.changePoint')}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => void openWidget()}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#ba1b02] hover:bg-[#a01802] text-white font-semibold py-3 text-sm transition-colors"
        >
          <MapPin size={18} />
          {t('checkout.packeta.openPicker')}
        </button>
      )}

      {open ? (
        <div
          className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/50 p-2 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t('checkout.packeta.pickerAria')}
        >
          <div className="relative w-full max-w-lg max-h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
              <h3 className="font-bold text-gray-900">{t('checkout.packeta.pickerTitle')}</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-2 rounded-full hover:bg-gray-100"
                aria-label={t('checkout.packeta.close')}
              >
                <X size={20} />
              </button>
            </div>
            <div className="px-4 py-3 border-b border-gray-100 shrink-0">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('checkout.packeta.searchPlaceholder')}
                  className="w-full rounded-xl border border-gray-200 pl-9 pr-3 py-2.5 text-sm"
                  autoFocus
                />
              </div>
              {!apiKey ? (
                <p className="text-[11px] text-gray-500 mt-2">{t('checkout.packeta.listHint')}</p>
              ) : null}
            </div>
            <ul className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {results.length === 0 ? (
                <li className="px-4 py-8 text-center text-sm text-gray-500">
                  {t('checkout.packeta.noResults')}
                </li>
              ) : (
                results.map((point) => (
                  <li key={point.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(point);
                        setOpen(false);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <p className="font-semibold text-sm text-gray-900">{packetaPointLabel(point)}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{packetaPointAddress(point)}</p>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
