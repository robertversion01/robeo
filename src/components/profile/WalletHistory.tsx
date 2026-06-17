'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { History } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@/lib/utils';
import type { WalletLedgerRow } from '@/lib/walletLedger';

type Props = {
  userId: string | null | undefined;
};

const TYPE_LABELS: Record<string, string> = {
  credit_pending: 'Eladás (letét)',
  release: 'Elérhetővé vált',
  cashout: 'Kifizetés',
  debit: 'Terhelés',
  adjustment: 'Korrekció',
};

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-950/50 text-amber-300 border border-amber-900/40',
  completed: 'bg-emerald-950/50 text-emerald-300 border border-emerald-900/40',
  failed: 'bg-red-950/50 text-red-300 border border-red-900/40',
};

export default function WalletHistory({ userId }: Props) {
  const [rows, setRows] = useState<WalletLedgerRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('wallet_transactions')
      .select(
        'id, user_id, transaction_id, product_id, entry_type, amount_huf, status, description, created_at, completed_at',
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(40);

    if (error) {
      console.warn('[WalletHistory]', error.message);
      setRows([]);
    } else {
      setRows((data || []) as WalletLedgerRow[]);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`wallet-ledger-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallet_transactions',
          filter: `user_id=eq.${userId}`,
        },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, load]);

  if (!userId) return null;

  return (
    <section className="mt-4 rounded-xl border border-[#2a3941] bg-[#1a2328] p-4" aria-label="Pénztárca előzmények">
      <div className="flex items-center gap-2 mb-3">
        <History size={18} className="text-[#38c7d0]" aria-hidden />
        <h3 className="text-sm font-bold text-[#e7edf0]">Pénztárca előzmények</h3>
      </div>

      {loading ? (
        <p className="text-xs text-[#8fa3ad]">Betöltés…</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-[#8fa3ad]">
          Még nincs könyvelt mozgás. Az első eladás után itt jelennek meg a tételek.
        </p>
      ) : (
        <ul className="divide-y divide-[#2a3941] max-h-72 overflow-y-auto">
          {rows.map((row) => (
            <li key={row.id} className="py-2.5 flex items-start justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium text-[#e7edf0]">
                  {TYPE_LABELS[row.entry_type] || row.entry_type}
                </p>
                <p className="text-xs text-[#8fa3ad] mt-0.5 line-clamp-1">
                  {row.description || '—'}
                </p>
                <p className="text-[10px] text-[#6b7d85] mt-0.5">
                  {new Date(row.created_at).toLocaleString('hu-HU')}
                </p>
                {row.product_id ? (
                  <Link
                    href={`/products/${row.product_id}`}
                    className="text-[10px] font-semibold text-[#007782] hover:underline"
                  >
                    Termék megnyitása
                  </Link>
                ) : null}
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold tabular-nums text-[#e7edf0]">
                  {row.entry_type === 'cashout' || row.entry_type === 'debit' ? '−' : '+'}
                  {formatPrice(row.amount_huf)}
                </p>
                <span
                  className={`inline-block mt-1 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                    STATUS_STYLES[row.status] || 'bg-[#243038] text-[#8fa3ad] border border-[#2a3941]'
                  }`}
                >
                  {row.status === 'pending' ? 'Függő' : row.status === 'completed' ? 'Kész' : 'Sikertelen'}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
