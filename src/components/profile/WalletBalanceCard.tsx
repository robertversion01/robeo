'use client';

import { useCallback, useEffect, useState } from 'react';
import { Wallet, ArrowDownToLine, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@/lib/utils';
import { toast } from 'sonner';
import type { WalletRow } from '@/lib/wallet';
import { fetchProfileRow } from '@/lib/supabaseResilience';

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
  const [connectOnboarded, setConnectOnboarded] = useState(false);
  const [busy, setBusy] = useState(false);

  const loadWallet = useCallback(async () => {
    if (!userId) {
      setWallet(EMPTY_WALLET);
      setLoading(false);
      return;
    }

    const [{ data, error }, profileRow] = await Promise.all([
      supabase
        .from('wallets')
        .select('available_balance, pending_balance, currency')
        .eq('user_id', userId)
        .maybeSingle(),
      fetchProfileRow<{
        stripe_connect_onboarded?: boolean | null;
        connected_account_id?: string | null;
        stripe_account_id?: string | null;
      }>(supabase, userId, [
        'stripe_connect_onboarded, connected_account_id, stripe_account_id',
        'connected_account_id, stripe_account_id',
        'stripe_account_id',
      ]),
    ]);

    if (error) {
      console.warn('[WalletBalanceCard] load failed', error);
    }

    setWallet({
      available_balance: data?.available_balance ?? 0,
      pending_balance: data?.pending_balance ?? 0,
      currency: data?.currency ?? 'HUF',
    });
    setConnectOnboarded(
      Boolean(
        profileRow?.stripe_connect_onboarded ||
          profileRow?.connected_account_id ||
          profileRow?.stripe_account_id,
      ),
    );
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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('connect') === 'success') {
      toast.success('Bankszámla csatlakoztatva! Most már kifizetheted az egyenleged.');
      params.delete('connect');
      const q = params.toString();
      window.history.replaceState({}, '', `${window.location.pathname}${q ? `?${q}` : ''}`);
      void loadWallet();
    }
  }, [loadWallet]);

  const startOnboarding = async () => {
    if (!userId) return;
    setBusy(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const res = await fetch('/api/stripe-connect/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, email: user?.email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Onboarding sikertelen');
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      if (data.onboarded) {
        setConnectOnboarded(true);
        toast.success('A bankszámla már csatlakoztatva van.');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Nem sikerült az onboarding.');
    } finally {
      setBusy(false);
    }
  };

  const cashOut = async () => {
    if (!userId) return;
    if (wallet.available_balance < 1) {
      toast.error('Nincs kifizethető egyenleg.');
      return;
    }

    if (!connectOnboarded) {
      toast.info('Előbb csatlakoztasd a bankszámládat a Stripe-on.');
      await startOnboarding();
      return;
    }

    setBusy(true);
    try {
      const res = await fetch('/api/stripe-connect/cashout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();

      if (data.error === 'connect_required' || data.error === 'connect_incomplete') {
        await startOnboarding();
        return;
      }

      if (!res.ok) throw new Error(data.message || data.error || 'Kifizetés sikertelen');

      toast.success(
        `Kifizetés elindítva: ${Number(data.amountHuf || wallet.available_balance).toLocaleString('hu-HU')} Ft`,
      );
      await loadWallet();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Kifizetés sikertelen.');
    } finally {
      setBusy(false);
    }
  };

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

      {!connectOnboarded ? (
        <p className="text-xs text-amber-700 mb-2">
          A kifizetéshez egyszeri bankszámla-ellenőrzés szükséges (Stripe Connect).
        </p>
      ) : null}

      <button
        type="button"
        disabled={busy || loading}
        onClick={() => void cashOut()}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#007782] hover:bg-[#006670] disabled:opacity-60 px-4 py-3 text-sm font-semibold text-white transition-colors"
      >
        {busy ? <Loader2 size={18} className="animate-spin" /> : <ArrowDownToLine size={18} />}
        Kifizetés bankszámlára
      </button>
    </section>
  );
}
