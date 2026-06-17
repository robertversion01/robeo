'use client';

import { useTranslation } from 'react-i18next';
import HorizontalScrollRow from '@/components/ui/HorizontalScrollRow';
import { cn } from '@/lib/utils';

export type ProfileTabId = 'shop' | 'reviews' | 'settings' | 'admin';

type Props = {
  active: ProfileTabId;
  onChange: (tab: ProfileTabId) => void;
  counts?: Partial<Record<ProfileTabId, number>>;
  showAdmin?: boolean;
};

export default function ProfileTabNav({ active, onChange, counts, showAdmin = false }: Props) {
  const { t } = useTranslation();

  const tabs: ProfileTabId[] = showAdmin
    ? ['shop', 'reviews', 'settings', 'admin']
    : ['shop', 'reviews', 'settings'];

  return (
    <HorizontalScrollRow
      role="tablist"
      aria-label={t('profile.title')}
      bleed={false}
      innerClassName="gap-0"
      className="mb-5 border-b border-[#2a3941]"
    >
      {tabs.map((id) => {
        const count = counts?.[id];
        const isActive = active === id;
        return (
          <div
            key={id}
            role="tab"
            aria-selected={isActive}
            tabIndex={0}
            onClick={() => onChange(id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onChange(id);
              }
            }}
            className={cn(
              'shrink-0 cursor-pointer select-none border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors',
              isActive
                ? 'border-[#38c7d0] text-[#38c7d0]'
                : 'border-transparent text-[#97a9b0]',
              id === 'admin' && !isActive && 'text-amber-800',
            )}
          >
            {t(`profile.tabs.${id}`)}
            {count != null && count > 0 ? (
              <span className="ml-1.5 rounded-full bg-[#17343a] px-1.5 py-0.5 text-[10px] tabular-nums">
                {count}
              </span>
            ) : null}
          </div>
        );
      })}
    </HorizontalScrollRow>
  );
}
