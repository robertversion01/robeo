'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { MessageSquareReply } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import StarRating from './StarRating';

export type ReceivedReview = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  seller_response?: string | null;
  seller_response_at?: string | null;
};

type Props = {
  review: ReceivedReview;
  /** Csak a megertekelt elado sajat oldalan true — ekkor valaszolhat. */
  editable?: boolean;
  onUpdated?: (review: ReceivedReview) => void;
};

export default function ReceivedReviewCard({ review, editable = false, onUpdated }: Props) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith('en') ? 'en-HU' : 'hu-HU';
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(review.seller_response ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('auth');

      const res = await fetch('/api/reviews/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ reviewId: review.id, response: draft.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'failed');

      onUpdated?.({
        ...review,
        seller_response: data.seller_response,
        seller_response_at: data.seller_response_at,
      });
      toast.success(t('review.responseSaved'));
      setEditing(false);
    } catch {
      toast.error(t('review.responseError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
      <div className="flex items-center justify-between">
        <StarRating rating={review.rating} size={16} />
        <span className="text-xs text-gray-500">
          {new Date(review.created_at).toLocaleDateString(locale)}
        </span>
      </div>
      {review.comment ? <p className="text-sm mt-2 text-gray-700">{review.comment}</p> : null}

      {review.seller_response && !editing ? (
        <div className="mt-2 rounded-lg border-l-2 border-[#007782] bg-white px-3 py-2">
          <p className="text-[11px] font-semibold text-[#007782]">{t('review.sellerResponseLabel')}</p>
          <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-line">{review.seller_response}</p>
        </div>
      ) : null}

      {editable ? (
        editing ? (
          <div className="mt-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder={t('review.responsePlaceholder')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#007782] focus:outline-none"
            />
            <div className="mt-1.5 flex gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => void save()}
                className="rounded-lg bg-[#007782] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#00616b] disabled:opacity-60"
              >
                {saving ? t('review.saving') : t('review.saveResponse')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setDraft(review.seller_response ?? '');
                }}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                {t('review.cancel')}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#007782] hover:underline"
          >
            <MessageSquareReply size={13} />
            {review.seller_response ? t('review.editResponse') : t('review.respondCta')}
          </button>
        )
      ) : null}
    </div>
  );
}
