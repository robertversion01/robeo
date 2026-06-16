'use client';

import { useState } from 'react';
import { Flag, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

type Props = {
  reportedId: string;
  context?: 'message' | 'profile' | 'other';
  className?: string;
};

const REASONS = ['harassment', 'scam', 'spam', 'inappropriate', 'other'] as const;
type Reason = (typeof REASONS)[number];

export default function ReportUserButton({ reportedId, context = 'message', className = '' }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason>('harassment');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) {
        toast.error(t('report.loginRequired'));
        return;
      }
      const { error } = await supabase.from('user_reports').insert({
        reporter_id: user.id,
        reported_id: reportedId,
        context,
        reason,
        details: details.trim().slice(0, 500) || null,
      });
      if (error) {
        if (/relation|does not exist|schema/i.test(error.message)) {
          toast.error(t('report.schemaMissing'));
          return;
        }
        throw error;
      }
      toast.success(t('report.success'));
      setOpen(false);
      setDetails('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('report.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-red-600 ${className}`}
        title={t('report.action')}
      >
        <Flag size={14} />
        {t('report.action')}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 p-3"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">{t('report.title')}</h3>
              <button type="button" onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <p className="mt-1 text-xs text-gray-500">{t('report.subtitle')}</p>

            <label className="mt-3 block text-xs font-semibold text-gray-700">
              {t('report.reasonLabel')}
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as Reason)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#007782] focus:outline-none"
            >
              {REASONS.map((r) => (
                <option key={r} value={r}>
                  {t(`report.reasons.${r}`)}
                </option>
              ))}
            </select>

            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder={t('report.detailsPlaceholder')}
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#007782] focus:outline-none resize-none"
            />

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void submit()}
                className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {t('report.submit')}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                {t('report.cancel')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
