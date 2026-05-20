'use client';

import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

type Category = { id: string; label: string };

type Props = {
  categories: Category[];
  selectedCategory: string;
  onCategoryChange: (id: string) => void;
  className?: string;
};

const CATEGORY_I18N: Record<string, string> = {
  all: 'browse.categories.all',
  clothing: 'browse.categories.clothing',
  shoes: 'browse.categories.shoes',
  accessories: 'browse.categories.accessories',
  electronics: 'browse.categories.electronics',
  other: 'browse.categories.other',
};

export default function CategoryQuickChips({
  categories,
  selectedCategory,
  onCategoryChange,
  className,
}: Props) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        'flex gap-2 overflow-x-auto pb-1 no-scrollbar -mx-0.5 px-0.5',
        className,
      )}
      role="tablist"
      aria-label={t('browse.categories.label')}
    >
      {categories.map((cat) => {
        const active = selectedCategory === cat.id;
        const labelKey = CATEGORY_I18N[cat.id];
        const label = labelKey ? t(labelKey) : cat.label;
        return (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onCategoryChange(cat.id)}
            className={cn(
              'shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors touch-manipulation',
              active
                ? 'border-[#007782] bg-[#007782] text-white'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50',
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
