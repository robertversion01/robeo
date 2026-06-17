'use client';

import { useEffect, useState } from 'react';
import { Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import {
  fetchSellerBundleDiscountSettings,
  type SellerBundleDiscountSettings,
} from '@/lib/bundleDiscount';

type Props = {
  sellerId: string;
};

export default function SellerBundleHint({ sellerId }: Props) {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<SellerBundleDiscountSettings | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchSellerBundleDiscountSettings(supabase, sellerId).then((s) => {
      if (!cancelled) setSettings(s);
    });
    return () => {
      cancelled = true;
    };
  }, [sellerId]);

  if (!settings?.enabled || settings.tiers.length === 0) return null;

  const best = [...settings.tiers].sort((a, b) => b.percent - a.percent)[0];
  if (!best) return null;

  return (
    <div className="mb-3 flex items-start gap-2 rounded-xl border border-[#007782]/15 bg-[#007782]/5 px-3 py-2.5">
      <Package size={16} className="mt-0.5 shrink-0 text-[#007782]" aria-hidden />
      <p className="text-xs leading-relaxed text-[#b2c0c6]">
        {t('product.bundleHint', { items: best.items, percent: best.percent })}
      </p>
    </div>
  );
}
