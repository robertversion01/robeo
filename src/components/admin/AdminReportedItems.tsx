'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { getOptimizedImageUrl } from '@/lib/imageUtils';

type ReportRow = {
  id: string;
  product_id: string;
  reason: string;
  details: string | null;
  created_at: string;
  products: {
    id: string;
    name: string;
    image_url: string | null;
    user_id: string;
    status: string;
  } | null;
};

const REASON_LABELS: Record<string, string> = {
  spam: 'Spam',
  counterfeit: 'Hamisítvány',
  prohibited: 'Tiltott',
};

export default function AdminReportedItems() {
  const [reports, setReports] = useState<ReportRow[]>([]);
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
        return;
      }

      const res = await fetch('/api/admin/reports', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Betöltés sikertelen');
      setReports(data.reports || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Nem sikerült betölteni.');
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
      const res = await fetch('/api/admin/reports', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          reportId: report.id,
          action,
          productId: report.product_id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Művelet sikertelen');
      toast.success(action === 'dismiss' ? 'Bejelentés elvetve.' : 'Termék törölve (soft).');
      setReports((prev) => prev.filter((r) => r.id !== report.id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Hiba.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mt-6 border-t border-gray-200 pt-4">
      <h3 className="text-sm font-bold text-gray-900 mb-3">🚩 Bejelentett termékek</h3>
      {loading ? (
        <p className="text-xs text-gray-500">Betöltés…</p>
      ) : reports.length === 0 ? (
        <p className="text-xs text-gray-500">Nincs függő bejelentés.</p>
      ) : (
        <ul className="space-y-3 max-h-96 overflow-y-auto">
          {reports.map((r) => {
            const p = r.products;
            return (
              <li
                key={r.id}
                className="rounded-lg border border-red-200/80 bg-white p-3 flex gap-3"
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
                  <p className="text-sm font-semibold truncate">{p?.name || r.product_id}</p>
                  <p className="text-xs text-red-600 font-medium">
                    {REASON_LABELS[r.reason] || r.reason}
                  </p>
                  {r.details ? (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{r.details}</p>
                  ) : null}
                  <p className="text-[10px] text-gray-400 mt-1">
                    {new Date(r.created_at).toLocaleString('hu-HU')}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => void act(r, 'delete_product')}
                      className="text-xs font-semibold rounded-md bg-red-600 text-white px-2.5 py-1.5 hover:bg-red-700 disabled:opacity-50"
                    >
                      Törlés
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
