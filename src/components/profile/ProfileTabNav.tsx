'use client';

import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export type ProfileTabId = 'shop' | 'reviews' | 'about';

type Props = {
  active: ProfileTabId;
  onChange: (tab: ProfileTabId) => void;
  counts?: Partial<Record<ProfileTabId, number>>;
};

const TABS: ProfileTabId[] = ['shop', 'reviews', 'about'];

export default function ProfileTabNav({ active, onChange, counts }: Props) {
  const { t } = useTranslation();

  return (
    <div
      className="mb-6 flex gap-1 overflow-x-auto border-b border-gray-200 pb-0 no-scrollbar"
      role="tablist"
    >
      {TABS.map((id) => {
        const count = counts?.[id];
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active === id}
            onClick={() => onChange(id)}
            className={cn(
              'shrink-0 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors touch-manipulation',
              active === id
                ? 'border-[#007782] text-[#007782]'
                : 'border-transparent text-gray-500 hover:text-gray-800',
            )}
          >
            {t(`profile.tabs.${id}`)}
            {count != null && count > 0 ? (
              <span className="ml-1.5 rounded-full bg-[#007782]/10 px-1.5 py-0.5 text-[10px] tabular-nums">
                {count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
