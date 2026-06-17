'use client';

import { useTranslation } from 'react-i18next';
import type { ChatMessageRole } from '@/lib/systemMessageView';
import { cn } from '@/lib/utils';

type Props = {
  role: ChatMessageRole;
  className?: string;
};

export default function SystemMessageRoleBadge({ role, className }: Props) {
  const { t } = useTranslation();
  const isSeller = role === 'seller';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        isSeller ? 'bg-amber-100 text-amber-200' : 'bg-sky-100 text-sky-900',
        className,
      )}
    >
      {isSeller ? t('systemMessage.forSeller') : t('systemMessage.forBuyer')}
    </span>
  );
}
