'use client';

import { useCallback, useState } from 'react';
import { AlertTriangle, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Dac7FlaggedSeller } from '@/lib/dac7Report';
import { DAC7_MIN_EARNINGS_HUF, DAC7_MIN_SALES } from '@/lib/dac7Report';

export default function AdminDac7Report() {
  const [rows, setRows] = useState<Dac7FlaggedSeller[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Nincs bejelentkezve.');

      const res = await fetch('/api/admin/dac7-report', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Riport sikertelen');
      setRows(data.sellers || []);
      setLoaded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hiba');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const exportCsv = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    const res = await fetch('/api/admin/dac7-report?format=csv', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) return;

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `robeo-dac7-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-600" aria-hidden />
            NAV / DAC7 Riport
          </h3>
          <p className="text-xs text-gray-600 mt-1 max-w-xl">
            Demo küszöb: több mint {DAC7_MIN_SALES} sikeres eladás vagy nettó bevétel ≥{' '}
            {DAC7_MIN_EARNINGS_HUF.toLocaleString('hu-HU')} Ft. Teszt admin riport — nem adóbevallás.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void fetchReport()}
            disabled={loading}
            className="h-9 rounded-md bg-[#007782] px-3 text-xs font-semibold text-white hover:bg-[#00616b] disabled:opacity-60"
          >
            {loading ? 'Szkennelés…' : loaded ? 'Frissítés' : 'Riport futtatása'}
          </button>
          {rows.length > 0 ? (
            <button
              type="button"
              onClick={() => void exportCsv()}
              className="h-9 inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-800 hover:bg-gray-50"
            >
              <Download size={14} aria-hidden />
              CSV export
            </button>
          ) : null}
        </div>
      </div>

      {error ? <p className="text-xs text-red-600 mb-2">{error}</p> : null}

      {!loaded && !loading ? (
        <p className="text-xs text-gray-500">Kattints a „Riport futtatása” gombra a figyelmeztetett eladók listázásához.</p>
      ) : null}

      {loaded && rows.length === 0 && !loading ? (
        <p className="text-xs text-emerald-700 font-medium">Nincs DAC7 küszöböt elérő teszt eladó.</p>
      ) : null}

      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-amber-100 bg-white">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-600">
                <th className="px-2 py-2">Eladó</th>
                <th className="px-2 py-2">E-mail</th>
                <th className="px-2 py-2 text-right">Eladások</th>
                <th className="px-2 py-2 text-right">Nettó (Ft)</th>
                <th className="px-2 py-2">Ok</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.userId} className="border-t border-gray-100">
                  <td className="px-2 py-2 font-medium">{r.displayName || r.userId.slice(0, 8)}</td>
                  <td className="px-2 py-2 text-gray-600">{r.email || '—'}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{r.completedSales}</td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {r.cumulativeEarningsHuf.toLocaleString('hu-HU')}
                  </td>
                  <td className="px-2 py-2 text-amber-800">{r.flaggedReasons.join(' · ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
