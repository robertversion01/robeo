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
  pending: 'bg-amber-100 text-amber-800',
  completed: 'bg-emerald-100 text-emerald-800',
  failed: 'bg-red-100 text-red-800',
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
    <section className="mt-4 rounded-xl border border-gray-200 bg-white p-4" aria-label="Pénztárca előzmények">
      <div className="flex items-center gap-2 mb-3">
        <History size={18} className="text-[#007782]" aria-hidden />
        <h3 className="text-sm font-bold text-gray-900">Pénztárca előzmények</h3>
      </div>

      {loading ? (
        <p className="text-xs text-gray-500">Betöltés…</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-gray-500">
          Még nincs könyvelt mozgás. Az első eladás után itt jelennek meg a tételek.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
          {rows.map((row) => (
            <li key={row.id} className="py-2.5 flex items-start justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium text-gray-900">
                  {TYPE_LABELS[row.entry_type] || row.entry_type}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                  {row.description || '—'}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">
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
                <p className="font-semibold tabular-nums text-gray-900">
                  {row.entry_type === 'cashout' || row.entry_type === 'debit' ? '−' : '+'}
                  {formatPrice(row.amount_huf)}
                </p>
                <span
                  className={`inline-block mt-1 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                    STATUS_STYLES[row.status] || 'bg-gray-100 text-gray-600'
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
