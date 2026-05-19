'use client';

import { useCallback, useEffect, useState } from 'react';
import { Wallet, ArrowDownToLine } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@/lib/utils';
import type { WalletRow } from '@/lib/wallet';

type Props = {
  userId: string | null | undefined;
};

const EMPTY_WALLET: Pick<WalletRow, 'available_balance' | 'pending_balance' | 'currency'> = {
  available_balance: 0,
  pending_balance: 0,
  currency: 'HUF',
};

export default function WalletBalanceCard({ userId }: Props) {
  const [wallet, setWallet] = useState(EMPTY_WALLET);
  const [loading, setLoading] = useState(true);

  const loadWallet = useCallback(async () => {
    if (!userId) {
      setWallet(EMPTY_WALLET);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('wallets')
      .select('available_balance, pending_balance, currency')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('[WalletBalanceCard] load failed', error);
    }

    setWallet({
      available_balance: data?.available_balance ?? 0,
      pending_balance: data?.pending_balance ?? 0,
      currency: data?.currency ?? 'HUF',
    });
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void loadWallet();
  }, [loadWallet]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`robeo-wallet-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void loadWallet();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, loadWallet]);

  if (!userId) return null;

  return (
    <section
      className="mb-8 rounded-2xl border border-[#007782]/20 bg-gradient-to-br from-[#007782]/8 via-white to-emerald-50/80 p-5 shadow-sm"
      aria-label="Belső egyenleg"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#007782]/15 text-[#007782]">
          <Wallet size={20} aria-hidden />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Egyenlegem</h2>
          <p className="text-xs text-gray-500">Vinted-stílusú belső pénztárca</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-800/90">
            Letétben lévő összeg
          </p>
          <p className="mt-1 text-xl font-semibold text-amber-900 tabular-nums">
            {loading ? '…' : formatPrice(wallet.pending_balance)}
          </p>
          <p className="text-[11px] text-amber-700/80 mt-0.5">
            Amíg a vevő nem erősíti meg az átvételt
          </p>
        </div>

        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-800/90">
            Elérhető egyenleg
          </p>
          <p className="mt-1 text-2xl font-bold text-emerald-700 tabular-nums">
            {loading ? '…' : formatPrice(wallet.available_balance)}
          </p>
          <p className="text-[11px] text-emerald-700/80 mt-0.5">Kifizethető összeg</p>
        </div>
      </div>

      <button
        type="button"
        disabled
        title="Hamarosan: Stripe Connect kifizetés"
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-400 cursor-not-allowed"
      >
        <ArrowDownToLine size={18} aria-hidden />
        Kifizetés bankszámlára
      </button>
      <p className="text-center text-[11px] text-gray-400 mt-2">
        A kifizetés hamarosan Stripe Connecttel érkezik.
      </p>
    </section>
  );
}
