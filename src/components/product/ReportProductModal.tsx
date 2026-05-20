'use client';

import { useState } from 'react';
import { X, Flag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export type ReportReason = 'spam' | 'counterfeit' | 'prohibited';

type Props = {
  productId: string;
  productName: string;
  open: boolean;
  onClose: () => void;
};

export default function ReportProductModal({ productId, productName, open, onClose }: Props) {
  const { t } = useTranslation();
  const [reason, setReason] = useState<ReportReason>('spam');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reasons: { id: ReportReason; labelKey: string }[] = [
    { id: 'spam', labelKey: 'report.reasonSpam' },
    { id: 'counterfeit', labelKey: 'report.reasonCounterfeit' },
    { id: 'prohibited', labelKey: 'report.reasonProhibited' },
  ];

  if (!open) return null;

  const submit = async () => {
    setSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error(t('report.loginRequired'));
        return;
      }

      const { error } = await supabase.from('reports').insert({
        product_id: productId,
        reporter_id: user.id,
        reason,
        details: details.trim() || null,
        status: 'pending',
      });

      if (error) throw error;
      toast.success(t('report.success'));
      onClose();
      setDetails('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('report.submit'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 id="report-modal-title" className="font-bold text-gray-900 flex items-center gap-2">
            <Flag size={18} className="text-red-500" />
            {t('report.title')}
          </h2>
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-600">
            <span className="font-medium text-gray-900">{productName}</span>
          </p>

          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              {t('report.reasonLegend')}
            </legend>
            {reasons.map((r) => (
              <label
                key={r.id}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer ${
                  reason === r.id
                    ? 'border-[#007782] bg-[#007782]/5 text-[#007782]'
                    : 'border-gray-200'
                }`}
              >
                <input
                  type="radio"
                  name="report-reason"
                  value={r.id}
                  checked={reason === r.id}
                  onChange={() => setReason(r.id)}
                  className="text-[#007782]"
                />
                {t(r.labelKey)}
              </label>
            ))}
          </fieldset>

          <label className="block text-sm text-gray-700">
            {t('report.details')}
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder={t('report.detailsPlaceholder')}
            />
          </label>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-300 py-2.5 text-sm font-semibold text-gray-700"
            >
              {t('report.cancel')}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void submit()}
              className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 py-2.5 text-sm font-semibold text-white"
            >
              {submitting ? t('report.submitting') : t('report.submit')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
