'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { getOptimizedImageUrl } from '@/lib/imageUtils';

type ReportRow = {
  id: string;
  product_id: string;
  reporter_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  products: {
    id: string;
    name: string;
    image_url: string | null;
    user_id: string;
    status: string;
  } | null;
  reporter: {
    email: string | null;
    full_name: string | null;
  } | null;
};

const REASON_LABELS: Record<string, string> = {
  spam: 'Spam',
  counterfeit: 'Hamisítvány',
  prohibited: 'Tiltott tartalom',
};

export default function AdminReportedItems() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setReports([]);
        setPendingCount(0);
        return;
      }

      const res = await fetch('/api/admin/reports?status=pending', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Betöltés sikertelen');
      setReports(data.reports || []);
      setPendingCount(data.pendingCount ?? (data.reports?.length || 0));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Nem sikerült betölteni.');
      setReports([]);
      setPendingCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (report: ReportRow, action: 'dismiss' | 'delete_product') => {
    setBusyId(report.id);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Nincs bejelentkezve.');
      }

      const res = await fetch('/api/admin/reports', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          reportId: report.id,
          action,
          productId: report.product_id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Művelet sikertelen');

      toast.success(
        action === 'dismiss'
          ? 'Bejelentés elvetve (dismissed).'
          : 'Termék soft-delete + bejelentés lezárva.',
      );
      setReports((prev) => prev.filter((r) => r.id !== report.id));
      setPendingCount((c) => Math.max(0, c - 1));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Hiba.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mt-6 border-t border-gray-200 pt-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-bold text-gray-900">
          🚩 Bejelentett termékek
          {pendingCount > 0 ? (
            <span className="ml-2 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
              {pendingCount}
            </span>
          ) : null}
        </h3>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          aria-label="Frissítés"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Frissítés
        </button>
      </div>

      {loading ? (
        <p className="text-xs text-gray-500">Bejelentések betöltése…</p>
      ) : reports.length === 0 ? (
        <p className="text-xs text-gray-500">Nincs függő (pending) bejelentés.</p>
      ) : (
        <ul className="space-y-3 max-h-[28rem] overflow-y-auto pr-1">
          {reports.map((r) => {
            const p = r.products;
            const productDeleted = p?.status === 'deleted';
            return (
              <li
                key={r.id}
                className="rounded-lg border border-red-200/80 bg-white p-3 flex gap-3 shadow-sm"
              >
                <div className="w-14 h-14 rounded-md bg-gray-100 overflow-hidden shrink-0">
                  {p?.image_url ? (
                    <img
                      src={getOptimizedImageUrl(p.image_url, 112, 112)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl flex items-center justify-center h-full">📷</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-1">
                    <p className="text-sm font-semibold truncate">{p?.name || r.product_id}</p>
                    {productDeleted ? (
                      <span className="text-[10px] font-bold uppercase text-red-700 bg-red-50 px-1.5 py-0.5 rounded">
                        törölve
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-red-600 font-medium">
                    {REASON_LABELS[r.reason] || r.reason}
                  </p>
                  {r.details ? (
                    <p className="text-xs text-gray-600 mt-1 line-clamp-3">{r.details}</p>
                  ) : null}
                  <p className="text-[10px] text-gray-400 mt-1">
                    {new Date(r.created_at).toLocaleString('hu-HU')}
                    {r.reporter?.email ? ` · ${r.reporter.email}` : ''}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {p?.id ? (
                      <Link
                        href={`/products/${p.id}`}
                        className="text-xs font-semibold text-[#007782] hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Termék megnyitása
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      disabled={busyId === r.id || productDeleted}
                      onClick={() => void act(r, 'delete_product')}
                      className="text-xs font-semibold rounded-md bg-red-600 text-white px-2.5 py-1.5 hover:bg-red-700 disabled:opacity-50"
                    >
                      {busyId === r.id ? '…' : 'Törlés'}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => void act(r, 'dismiss')}
                      className="text-xs font-semibold rounded-md border border-gray-300 px-2.5 py-1.5 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Elvetés
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
