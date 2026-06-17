'use client';

import { Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { SellerSavedReply } from '@/lib/sellerSavedReplies';

type Props = {
  replies: SellerSavedReply[];
  onPick: (body: string) => void;
  className?: string;
};

export default function SavedReplyChips({ replies, onPick, className = '' }: Props) {
  const { t } = useTranslation();
  if (replies.length === 0) return null;

  return (
    <div className={className}>
      <p className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[#8fa3ad]">
        <Zap size={11} className="text-[#007782]" />
        {t('savedReplies.quickInsert')}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {replies.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => onPick(r.body)}
            title={r.body}
            className="rounded-full border border-[#007782]/25 bg-[#007782]/5 px-2.5 py-1 text-[11px] font-medium text-[#007782] hover:bg-[#007782]/10"
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}
