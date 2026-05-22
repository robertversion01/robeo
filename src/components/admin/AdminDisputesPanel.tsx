'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { disputeReasonLabel } from '@/lib/disputes';
import { formatPrice } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

type DisputeAdminRow = {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
  transactions: {
    id: string;
    amount: number;
    products: { id: string; name: string; image_url: string | null } | null;
  } | null;
};

export default function AdminDisputesPanel() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith('en') ? 'en' : 'hu';
  const [rows, setRows] = useState<DisputeAdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const adminFetch = useCallback(async (path: string, init?: RequestInit) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Nincs munkamenet.');
    const res = await fetch(path, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        ...(init?.headers || {}),
      },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Sikertelen.');
    return data;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminFetch('/api/admin/disputes?status=open');
      setRows(data.disputes || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Betöltés sikertelen.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [adminFetch]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (row: DisputeAdminRow, action: 'refund' | 'reject' | 'review') => {
    setBusyId(row.id);
    try {
      await adminFetch('/api/admin/disputes', {
        method: 'PATCH',
        body: JSON.stringify({ disputeId: row.id, action }),
      });
      toast.success(t(`disputes.admin.${action}Done`));
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('disputes.failed'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-gray-900">{t('disputes.admin.title')}</h3>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1 text-xs text-[#007782] font-semibold"
        >
          <RefreshCw size={14} />
          {t('disputes.admin.refresh')}
        </button>
      </div>

      {loading ? (
        <p className="text-xs text-gray-500">{t('disputes.admin.loading')}</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-gray-500">{t('disputes.admin.empty')}</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => {
            const tx = row.transactions;
            const product = tx?.products;
            return (
              <li key={row.id} className="rounded-xl border border-gray-200 p-3 text-sm">
                <div className="flex justify-between gap-2">
                  <p className="font-semibold truncate">{product?.name || '—'}</p>
                  <span className="text-[#007782] font-bold shrink-0">
                    {tx ? formatPrice(tx.amount) : '—'}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {disputeReasonLabel(row.reason, locale)}
                  {row.details ? ` — ${row.details}` : ''}
                </p>
                <p className="text-[10px] text-gray-400 mt-1">
                  {new Date(row.created_at).toLocaleString(locale === 'en' ? 'en-HU' : 'hu-HU')}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busyId === row.id}
                    onClick={() => void act(row, 'review')}
                    className="rounded-md border px-2 py-1 text-[11px] font-semibold"
                  >
                    {t('disputes.admin.review')}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === row.id}
                    onClick={() => void act(row, 'refund')}
                    className="rounded-md bg-[#007782] text-white px-2 py-1 text-[11px] font-semibold"
                  >
                    {t('disputes.admin.refund')}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === row.id}
                    onClick={() => void act(row, 'reject')}
                    className="rounded-md border border-red-200 text-red-700 px-2 py-1 text-[11px] font-semibold"
                  >
                    {t('disputes.admin.reject')}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
