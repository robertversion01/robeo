'use client';

import { useCallback, useEffect, useState } from 'react';
import { FileText, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@/lib/utils';
import type { InvoiceRow } from '@/lib/demoInvoice';

type Props = {
  userId: string | null | undefined;
};

export default function MyInvoices({ userId }: Props) {
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('invoices')
      .select(
        'id, transaction_id, user_id, invoice_number, total_amount, fee_amount, shipping_amount, product_amount, pdf_url, demo_mode, meta, created_at',
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.warn('[MyInvoices]', error.message);
      setRows([]);
    } else {
      setRows((data || []) as InvoiceRow[]);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`invoices-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invoices',
          filter: `user_id=eq.${userId}`,
        },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, load]);

  const downloadInvoice = async (invoiceId: string) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    const res = await fetch(`/api/invoices/${invoiceId}/download`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) return;

    const html = await res.text();
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  if (!userId) return null;

  return (
    <section className="space-y-4" aria-label="Számláim">
      <div className="flex items-center gap-2">
        <FileText size={18} className="text-[#007782]" aria-hidden />
        <h2 className="text-lg font-bold text-gray-900">Számláim</h2>
        <span className="text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
          Demo
        </span>
      </div>
      <p className="text-xs text-gray-500">
        Sikeres átvétel után automatikusan készül demó számla. Nem minősül hivatalos NAV bizonylatnak.
      </p>

      {loading ? (
        <p className="text-sm text-gray-500">Betöltés…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500 rounded-xl border border-dashed border-gray-200 p-6 text-center">
          Még nincs számla. A „Minden rendben” megerősítés után itt jelenik meg a bizonylat.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white overflow-hidden">
          {rows.map((inv) => {
            const meta = inv.meta as { product_name?: string } | undefined;
            return (
              <li
                key={inv.id}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50/80"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 font-mono">
                    {inv.invoice_number}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {(meta?.product_name as string) || 'Vásárlás'} ·{' '}
                    {new Date(inv.created_at).toLocaleDateString('hu-HU')}
                  </p>
                  <p className="text-sm font-medium text-[#007782] mt-0.5">
                    {formatPrice(inv.total_amount)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void downloadInvoice(inv.id)}
                  className="shrink-0 inline-flex items-center gap-1.5 h-9 rounded-lg border border-[#007782] px-3 text-xs font-semibold text-[#007782] hover:bg-[#007782]/5"
                >
                  <Download size={14} aria-hidden />
                  Letöltés
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
