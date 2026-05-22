'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@/lib/utils';

type Props = {
  buyerId: string;
  onUseWalletChange: (use: boolean) => void;
  useWallet: boolean;
  total: number;
};

export default function CheckoutWalletOption({
  buyerId,
  onUseWalletChange,
  useWallet,
  total,
}: Props) {
  const { t } = useTranslation();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const initRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('wallets')
        .select('available_balance')
        .eq('user_id', buyerId)
        .maybeSingle();
      if (!cancelled) {
        const avail = Math.max(0, Math.round(Number(data?.available_balance) || 0));
        setBalance(avail);
        if (avail > 0 && !initRef.current) {
          initRef.current = true;
          onUseWalletChange(true);
        }
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [buyerId, onUseWalletChange]);

  if (loading || balance <= 0) return null;

  const applied = Math.min(balance, total);

  return (
    <label className="flex items-start gap-3 rounded-xl border border-[#007782]/25 bg-[#007782]/5 p-3 cursor-pointer">
      <input
        type="checkbox"
        checked={useWallet}
        onChange={(e) => onUseWalletChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 accent-[#007782]"
      />
      <span className="text-sm text-gray-800">
        <span className="font-semibold block">{t('checkout.wallet.useBalance')}</span>
        <span className="text-xs text-gray-600">
          {t('checkout.wallet.available', { amount: formatPrice(balance) })}
          {useWallet ? ` · ${t('checkout.wallet.willApply', { amount: formatPrice(applied) })}` : ''}
        </span>
      </span>
    </label>
  );
}
