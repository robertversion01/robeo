'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getBundleCart, computeBundleTotals } from '@/lib/sellerBundleCart';
import { fetchSellerBundleDiscountSettings } from '@/lib/bundleDiscount';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@/lib/utils';

type Props = {
  sellerId: string;
  currentProductId: string;
};

export default function CheckoutBundleNudge({ sellerId, currentProductId }: Props) {
  const { t } = useTranslation();
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const cart = getBundleCart();
    if (!cart || cart.sellerId !== sellerId) return;
    const others = cart.items.filter((i) => i.productId !== currentProductId);
    if (others.length === 0) return;
    void fetchSellerBundleDiscountSettings(supabase, sellerId).then((settings) => {
      const totals = computeBundleTotals(cart.items, settings);
      setLabel(
        t('bundle.checkoutNudge', {
          count: others.length,
          savings: formatPrice(totals.savings),
        }),
      );
    });
  }, [sellerId, currentProductId, t]);

  if (!label) return null;

  return (
    <div className="rounded-xl border border-[#007782]/20 bg-[#007782]/5 p-3 flex gap-2 items-start">
      <Package size={18} className="shrink-0 text-[#007782] mt-0.5" />
      <div className="min-w-0 text-xs">
        <p className="text-[#e7edf0]">{label}</p>
        <Link href={`/profile/${sellerId}`} className="font-semibold text-[#007782] hover:underline mt-1 inline-block">
          {t('bundle.checkoutNudgeLink')} →
        </Link>
      </div>
    </div>
  );
}
