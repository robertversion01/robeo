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
  women: 'browse.departments.women',
  men: 'browse.departments.men',
  kids: 'browse.departments.kids',
  home: 'browse.departments.home',
  electronics: 'browse.departments.electronics',
  entertainment: 'browse.departments.entertainment',
  sports: 'browse.departments.sports',
  pets: 'browse.departments.pets',
  other: 'browse.departments.other',
  clothing: 'browse.categories.clothing',
  shoes: 'browse.categories.shoes',
  accessories: 'browse.categories.accessories',
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
        'flex gap-2.5 overflow-x-auto pb-2 no-scrollbar -mx-0.5 px-0.5',
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
              'shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all touch-manipulation',
              active
                ? 'border-[#007782] bg-[#007782] text-white shadow-sm'
                : 'border-gray-200 bg-white text-gray-700 hover:border-[#007782]/30 hover:bg-[#007782]/5',
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
