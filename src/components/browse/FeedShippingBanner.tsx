'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MOBILE_BOTTOM_NAV_INNER } from '@/lib/layoutTokens';

const STORAGE_KEY = 'robeo_feed_shipping_banner_dismissed';

function readBannerVisible(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(STORAGE_KEY) !== '1';
  } catch {
    return true;
  }
}

export default function FeedShippingBanner() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(readBannerVisible);

  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[9975] md:hidden"
      style={{
        bottom: `calc(${MOBILE_BOTTOM_NAV_INNER} + env(safe-area-inset-bottom, 0px) + 0.25rem)`,
      }}
    >
      <div className="pointer-events-auto mx-2 mb-2 flex items-start gap-2 rounded-xl border border-white/10 bg-[#2c2c2e] px-3 py-2.5 text-xs leading-snug text-gray-100 shadow-lg">
        <p className="flex-1">{t('browse.feed.shippingBanner')}</p>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-full p-1 text-gray-400 transition hover:bg-white/10 hover:text-white touch-manipulation"
          aria-label={t('browse.feed.shippingBannerDismiss')}
        >
          <X size={16} aria-hidden />
        </button>
      </div>
    </div>
  );
}
