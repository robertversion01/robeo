'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  canBuyerOpenDispute,
  disputeReasonLabel,
  isDisputeActive,
  type DisputeRow,
} from '@/lib/disputes';

type Props = {
  transactionId: string;
  productName?: string;
  txStatus: string;
  disputeStatus?: string | null;
};

const REASONS = ['not_received', 'not_as_described', 'damaged', 'other'] as const;

export default function DisputePanel({
  transactionId,
  productName,
  txStatus,
  disputeStatus,
}: Props) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith('en') ? 'en' : 'hu';
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof REASONS)[number]>('not_received');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [dispute, setDispute] = useState<DisputeRow | null>(null);
  const [loading, setLoading] = useState(true);

  const canOpen = canBuyerOpenDispute(txStatus, disputeStatus);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setDispute(null);
        return;
      }
      const res = await fetch(`/api/disputes?transactionId=${encodeURIComponent(transactionId)}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setDispute(data.dispute || null);
      }
    } finally {
      setLoading(false);
    }
  }, [transactionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    if (details.trim().length < 10) {
      toast.error(t('disputes.detailsTooShort'));
      return;
    }
    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error(t('disputes.loginRequired'));

      const res = await fetch('/api/disputes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ transactionId, reason, details: details.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('disputes.failed'));

      toast.success(t('disputes.submitted'));
      setOpen(false);
      setDetails('');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('disputes.failed'));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return null;
  if (!canOpen && !dispute) return null;

  if (dispute) {
    const active = isDisputeActive(dispute.status);
    return (
      <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50/90 px-3 py-2 text-xs">
        <p className="font-semibold text-amber-900 flex items-center gap-1">
          <AlertTriangle size={14} />
          {t(`disputes.status.${dispute.status}`)}
        </p>
        <p className="text-amber-800 mt-1">
          {disputeReasonLabel(dispute.reason, locale)}
          {dispute.details ? ` — ${dispute.details}` : ''}
        </p>
        {active ? (
          <p className="text-[11px] text-amber-700 mt-1">{t('disputes.activeHint')}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-semibold text-amber-800 hover:underline inline-flex items-center gap-1"
      >
        <AlertTriangle size={14} />
        {t('disputes.openCta')}
      </button>
      {open ? (
        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50/90 p-3 text-sm">
          <p className="text-xs text-amber-900 mb-2">
            {productName ? `${productName} — ` : ''}
            {t('disputes.formHint')}
          </p>
          <label className="block text-[11px] font-semibold text-amber-900 mb-1">
            {t('disputes.reasonLabel')}
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as (typeof REASONS)[number])}
            className="w-full rounded border border-amber-200 px-2 py-1.5 text-xs mb-2 bg-white"
          >
            {REASONS.map((r) => (
              <option key={r} value={r}>
                {disputeReasonLabel(r, locale)}
              </option>
            ))}
          </select>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder={t('disputes.detailsPlaceholder')}
            className="w-full rounded border border-amber-200 px-2 py-1.5 text-xs min-h-[60px]"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className="mt-2 h-8 inline-flex items-center gap-1 rounded-md bg-amber-700 px-3 text-xs font-semibold text-white hover:bg-amber-800 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            {t('disputes.submit')}
          </button>
        </div>
      ) : null}
    </div>
  );
}
