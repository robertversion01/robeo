'use client';

import { useState } from 'react';
import { X, MessageSquarePlus, Bug, Lightbulb, Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { trackEvent, AnalyticsEvent } from '@/lib/analytics';

type FeedbackType = 'bug' | 'idea' | 'praise' | 'other';

type Props = {
  open: boolean;
  onClose: () => void;
};

const TYPES: { id: FeedbackType; labelKey: string; icon: typeof Bug }[] = [
  { id: 'bug', labelKey: 'feedback.types.bug', icon: Bug },
  { id: 'idea', labelKey: 'feedback.types.idea', icon: Lightbulb },
  { id: 'praise', labelKey: 'feedback.types.praise', icon: Heart },
];

export default function FeedbackModal({ open, onClose }: Props) {
  const { t } = useTranslation();
  const [type, setType] = useState<FeedbackType>('bug');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const submit = async () => {
    const trimmed = message.trim();
    if (trimmed.length < 3) {
      toast.error(t('feedback.tooShort'));
      return;
    }
    setSubmitting(true);
    try {
      let token: string | undefined;
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        token = session?.access_token ?? undefined;
      } catch {
        token = undefined;
      }

      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          type,
          message: trimmed,
          path: typeof window !== 'undefined' ? window.location.pathname : null,
        }),
      });

      if (!res.ok) throw new Error('failed');

      trackEvent(AnalyticsEvent.FeedbackSubmitted, { type });
      toast.success(t('feedback.success'));
      setMessage('');
      onClose();
    } catch {
      toast.error(t('feedback.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-modal-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 id="feedback-modal-title" className="font-bold text-gray-900 flex items-center gap-2">
            <MessageSquarePlus size={18} className="text-[#007782]" />
            {t('feedback.title')}
          </h2>
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-gray-100" aria-label={t('feedback.cancel')}>
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-600">{t('feedback.subtitle')}</p>

          <div className="grid grid-cols-3 gap-2">
            {TYPES.map((opt) => {
              const Icon = opt.icon;
              const active = type === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setType(opt.id)}
                  className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-xs font-medium transition-colors ${
                    active
                      ? 'border-[#007782] bg-[#007782]/5 text-[#007782]'
                      : 'border-gray-200 text-gray-600 hover:border-[#007782]/30'
                  }`}
                >
                  <Icon size={18} />
                  {t(opt.labelKey)}
                </button>
              );
            })}
          </div>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            maxLength={2000}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#007782] focus:outline-none"
            placeholder={t('feedback.placeholder')}
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-300 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              {t('feedback.cancel')}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void submit()}
              className="flex-1 rounded-xl bg-[#007782] hover:bg-[#00616b] disabled:opacity-60 py-2.5 text-sm font-semibold text-white"
            >
              {submitting ? t('feedback.submitting') : t('feedback.submit')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
