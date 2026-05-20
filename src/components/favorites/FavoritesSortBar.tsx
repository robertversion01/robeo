'use client';

import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export type FavoritesSortId = 'newest' | 'price_asc' | 'price_desc';

type Props = {
  value: FavoritesSortId;
  onChange: (value: FavoritesSortId) => void;
  className?: string;
};

const SORTS: { id: FavoritesSortId; key: string }[] = [
  { id: 'newest', key: 'favorites.sortNewest' },
  { id: 'price_asc', key: 'favorites.sortPriceAsc' },
  { id: 'price_desc', key: 'favorites.sortPriceDesc' },
];

export default function FavoritesSortBar({ value, onChange, className }: Props) {
  const { t } = useTranslation();

  return (
    <div
      className={cn('flex flex-wrap gap-2', className)}
      role="group"
      aria-label={t('favorites.sortLabel')}
    >
      {SORTS.map((sort) => (
        <button
          key={sort.id}
          type="button"
          onClick={() => onChange(sort.id)}
          className={cn(
            'rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors touch-manipulation',
            value === sort.id
              ? 'border-[#007782] bg-[#007782] text-white'
              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300',
          )}
        >
          {t(sort.key)}
        </button>
      ))}
    </div>
  );
}
