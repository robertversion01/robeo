'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { RefreshCw, AlertTriangle, MessageSquare } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type FunnelRow = { name: string; total: number; last7d: number };
type FeedbackRow = {
  id: string;
  type: string;
  message: string;
  path: string | null;
  status: string;
  created_at: string;
};
type ErrorRow = {
  id: string;
  message: string;
  source: string | null;
  path: string | null;
  created_at: string;
};

const FUNNEL_LABELS: Record<string, string> = {
  product_view: 'Termék megtekintés',
  offer_sent: 'Ajánlat küldve',
  message_sent: 'Üzenet küldve',
  listing_created: 'Hirdetés feltöltve',
  signup_completed: 'Regisztráció kész',
  feedback_submitted: 'Visszajelzés',
};

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString('hu-HU', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function AdminObservabilityPanel() {
  const [funnel, setFunnel] = useState<FunnelRow[]>([]);
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [errors, setErrors] = useState<ErrorRow[]>([]);
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const openFeedbackCount = feedback.filter((f) => f.status !== 'closed').length;
  const issues: string[] = [];
  if (errors.length >= 8) issues.push('Magas hibaszám');
  if (openFeedbackCount >= 6) issues.push('Sok nyitott visszajelzés');
  if (funnel.length > 0 && funnel.every((row) => row.last7d === 0)) issues.push('Nincs friss aktivitás 7 napja');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Nincs érvényes munkamenet.');
      const res = await fetch('/api/admin/observability', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Betöltés sikertelen.');
      setFunnel(data.funnel || []);
      setFeedback(data.feedback || []);
      setErrors(data.errors || []);
      setSchemaMissing(Boolean(data.schemaMissing));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Betöltés sikertelen.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-[#8fa3ad]">
          Lokális mérés — saját Supabase. Anonim funnel, hibanapló, visszajelzések.
        </p>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#2a3941] px-2.5 text-xs font-semibold text-[#b2c0c6] hover:bg-[#1f2a30] disabled:opacity-60"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Frissítés
        </button>
      </div>

      {schemaMissing ? (
        <p className="rounded-lg border border-amber-900/45 bg-amber-950/40 px-3 py-2 text-xs text-amber-200">
          A táblák még nincsenek létrehozva. Futtasd: <code>supabase/patch-observability.sql</code>
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl border border-[#2a3941] bg-[#1a2328] p-3">
          <p className="text-[11px] text-[#8fa3ad]">Funnel események</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-[#e7edf0]">
            {funnel.reduce((sum, row) => sum + row.total, 0)}
          </p>
        </div>
        <div className="rounded-xl border border-[#2a3941] bg-[#1a2328] p-3">
          <p className="text-[11px] text-[#8fa3ad]">Visszajelzés</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-[#e7edf0]">{feedback.length}</p>
        </div>
        <div className="rounded-xl border border-[#2a3941] bg-[#1a2328] p-3">
          <p className="text-[11px] text-[#8fa3ad]">Nyitott feedback</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-amber-300">
            {openFeedbackCount}
          </p>
        </div>
        <div className="rounded-xl border border-[#2a3941] bg-[#1a2328] p-3">
          <p className="text-[11px] text-[#8fa3ad]">Hibanapló</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-red-300">{errors.length}</p>
        </div>
      </div>

      <div className="rounded-xl border border-[#2a3941] bg-[#1a2328] p-3">
        <p className="text-xs font-semibold text-[#e7edf0]">Minőség jelzés</p>
        {issues.length === 0 ? (
          <p className="mt-1 text-xs text-emerald-300">Stabil: nincs kiugró minőségromlási jel.</p>
        ) : (
          <ul className="mt-1 flex flex-wrap gap-2">
            {issues.map((issue) => (
              <li
                key={issue}
                className="rounded-full border border-amber-900/45 bg-amber-950/40 px-2 py-0.5 text-[10px] font-semibold text-amber-300"
              >
                {issue}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Funnel */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {funnel.map((row) => (
          <div key={row.name} className="rounded-xl border border-[#2a3941] bg-[#1a2328] p-3">
            <p className="text-[11px] font-medium text-[#8fa3ad]">
              {FUNNEL_LABELS[row.name] || row.name}
            </p>
            <p className="mt-1 text-lg font-bold text-[#e7edf0] tabular-nums">{row.total}</p>
            <p className="text-[10px] text-[#007782]">+{row.last7d} (7 nap)</p>
          </div>
        ))}
      </div>

      {/* Feedback */}
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-[#e7edf0]">
          <MessageSquare size={15} className="text-[#007782]" />
          Visszajelzések ({feedback.length})
        </p>
        {feedback.length === 0 ? (
          <p className="text-xs text-[#8fa3ad]">Nincs visszajelzés.</p>
        ) : (
          <ul className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-[#27363d] bg-[#141d21]/50 p-2">
            {feedback.map((f) => (
              <li key={f.id} className="rounded-lg border border-[#2a3941] bg-[#1a2328] p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-[#007782]/10 px-2 py-0.5 text-[10px] font-semibold text-[#007782]">
                    {f.type}
                  </span>
                  <span className="text-[10px] text-[#6b7d85]">{formatWhen(f.created_at)}</span>
                </div>
                <p className="mt-1 text-sm text-[#e7edf0] whitespace-pre-line break-words">{f.message}</p>
                {f.path ? <p className="mt-0.5 text-[10px] text-[#6b7d85]">{f.path}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Errors */}
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-[#e7edf0]">
          <AlertTriangle size={15} className="text-amber-600" />
          Hibanapló ({errors.length})
        </p>
        {errors.length === 0 ? (
          <p className="text-xs text-[#8fa3ad]">Nincs naplózott hiba.</p>
        ) : (
          <ul className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-[#27363d] bg-[#141d21]/50 p-2">
            {errors.map((e) => (
              <li key={e.id} className="rounded-lg border border-[#2a3941] bg-[#1a2328] p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                    {e.source || 'js'}
                  </span>
                  <span className="text-[10px] text-[#6b7d85]">{formatWhen(e.created_at)}</span>
                </div>
                <p className="mt-1 text-xs font-mono text-[#e7edf0] break-words">{e.message}</p>
                {e.path ? <p className="mt-0.5 text-[10px] text-[#6b7d85]">{e.path}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
