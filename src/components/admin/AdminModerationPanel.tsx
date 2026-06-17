'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, AlertTriangle, Flag } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

type Profile = { name: string | null; email: string | null } | null;

type UserReport = {
  id: string;
  context: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  reporter: Profile;
  reported: Profile;
};

type Offender = {
  id: string;
  listingReports: number;
  userReports: number;
  disputes: number;
  total: number;
  profile: Profile;
};

const STATUS_OPTIONS = ['pending', 'actioned', 'dismissed', 'all'] as const;

function label(p: Profile): string {
  return p?.name || p?.email || '—';
}

export default function AdminModerationPanel() {
  const { t, i18n } = useTranslation();
  const localeTag = i18n.language?.startsWith('en') ? 'en-HU' : 'hu-HU';
  const [reports, setReports] = useState<UserReport[]>([]);
  const [offenders, setOffenders] = useState<Offender[]>([]);
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>('pending');
  const [loading, setLoading] = useState(true);
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const adminFetch = useCallback(async (path: string, init?: RequestInit) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
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
      const data = await adminFetch(`/api/admin/moderation?status=${status}`);
      setReports(data.userReports || []);
      setOffenders(data.repeatOffenders || []);
      setSchemaMissing(Boolean(data.schemaMissing));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Betöltés sikertelen.');
    } finally {
      setLoading(false);
    }
  }, [adminFetch, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const resolve = async (id: string, action: 'dismiss' | 'actioned') => {
    setBusyId(id);
    try {
      await adminFetch('/api/admin/moderation', {
        method: 'PATCH',
        body: JSON.stringify({ reportId: id, action }),
      });
      toast.success(t('moderation.resolved'));
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Sikertelen.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-[#e7edf0]">{t('moderation.title')}</h3>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1 text-xs text-[#007782] font-semibold"
        >
          <RefreshCw size={14} />
          {t('moderation.refresh')}
        </button>
      </div>

      {/* Repeat offenders */}
      <div>
        <h4 className="flex items-center gap-1.5 text-xs font-bold text-[#b2c0c6]">
          <AlertTriangle size={13} className="text-amber-500" />
          {t('moderation.repeatTitle')}
        </h4>
        {offenders.length === 0 ? (
          <p className="mt-1 text-xs text-[#8fa3ad]">{t('moderation.repeatEmpty')}</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {offenders.map((o) => (
              <li
                key={o.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-amber-900/45 bg-amber-950/35 px-3 py-2 text-xs"
              >
                <span className="truncate font-semibold text-[#e7edf0]">{label(o.profile)}</span>
                <span className="flex shrink-0 gap-2 text-[10px] text-[#8fa3ad]">
                  <span title={t('moderation.listingReports')}>📦 {o.listingReports}</span>
                  <span title={t('moderation.userReports')}>🚩 {o.userReports}</span>
                  <span title={t('moderation.disputes')}>⚖ {o.disputes}</span>
                  <span className="font-bold text-amber-300">Σ {o.total}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* User reports */}
      <div>
        <div className="flex items-center justify-between gap-2">
          <h4 className="flex items-center gap-1.5 text-xs font-bold text-[#b2c0c6]">
            <Flag size={13} className="text-red-500" />
            {t('moderation.reportsTitle')}
          </h4>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as (typeof STATUS_OPTIONS)[number])}
            className="rounded-md border border-[#2a3941] px-2 py-1 text-[11px]"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {t(`moderation.status.${s}`)}
              </option>
            ))}
          </select>
        </div>

        {schemaMissing ? (
          <p className="mt-2 text-xs text-amber-600">{t('moderation.schemaMissing')}</p>
        ) : loading ? (
          <p className="mt-2 text-xs text-[#8fa3ad]">{t('moderation.loading')}</p>
        ) : reports.length === 0 ? (
          <p className="mt-2 text-xs text-[#8fa3ad]">{t('moderation.reportsEmpty')}</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {reports.map((r) => (
              <li key={r.id} className="rounded-lg border border-[#2a3941] p-2.5 text-xs">
                <div className="flex justify-between gap-2">
                  <span className="font-semibold text-[#e7edf0] truncate">
                    {label(r.reporter)} → {label(r.reported)}
                  </span>
                  <span className="shrink-0 text-[10px] text-[#6b7d85]">
                    {new Date(r.created_at).toLocaleDateString(localeTag)}
                  </span>
                </div>
                <p className="mt-1 text-[#8fa3ad]">
                  {t(`report.reasons.${r.reason}`)} · {r.context}
                  {r.details ? ` — ${r.details}` : ''}
                </p>
                {r.status === 'pending' ? (
                  <div className="mt-1.5 flex gap-2">
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => void resolve(r.id, 'actioned')}
                      className="rounded-md bg-red-600 px-2 py-1 text-[11px] font-semibold text-white"
                    >
                      {t('moderation.actioned')}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => void resolve(r.id, 'dismiss')}
                      className="rounded-md border px-2 py-1 text-[11px] font-semibold"
                    >
                      {t('moderation.dismiss')}
                    </button>
                  </div>
                ) : (
                  <span className="mt-1 inline-block text-[10px] font-semibold text-[#6b7d85]">
                    {t(`moderation.status.${r.status}`)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
