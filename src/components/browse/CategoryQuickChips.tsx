'use client';

import { useTranslation } from 'react-i18next';
import { useCallback, useEffect, useRef } from 'react';
import HorizontalScrollRow from '@/components/ui/HorizontalScrollRow';
import { categoryDisplayLabel } from '@/lib/categoryDisplay';
import { cn } from '@/lib/utils';

type Category = { id: string; label: string };

type Props = {
  categories: Category[];
  selectedCategory: string;
  onCategoryChange: (id: string) => void;
  className?: string;
  variant?: 'pill' | 'text';
  categoryCounts?: Record<string, number>;
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
  svc_home: 'browse.serviceDepartments.home',
  svc_beauty: 'browse.serviceDepartments.beauty',
  svc_fitness: 'browse.serviceDepartments.fitness',
  svc_education: 'browse.serviceDepartments.education',
  svc_it: 'browse.serviceDepartments.it',
  svc_creative: 'browse.serviceDepartments.creative',
  svc_pets: 'browse.serviceDepartments.pets',
  svc_events: 'browse.serviceDepartments.events',
  svc_other: 'browse.serviceDepartments.other',
  clothing: 'browse.categories.clothing',
  shoes: 'browse.categories.shoes',
  accessories: 'browse.categories.accessories',
};

const TAP_MOVE_THRESHOLD_PX = 10;

function CategoryTab({
  active,
  label,
  isText,
  onSelect,
  count,
}: {
  active: boolean;
  label: string;
  isText: boolean;
  onSelect: () => void;
  count?: number;
}) {
  const pointerRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    pointerRef.current = { x: e.clientX, y: e.clientY, moved: false };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerRef.current) return;
    const dx = Math.abs(e.clientX - pointerRef.current.x);
    const dy = Math.abs(e.clientY - pointerRef.current.y);
    if (dx > TAP_MOVE_THRESHOLD_PX || dy > TAP_MOVE_THRESHOLD_PX) {
      pointerRef.current.moved = true;
    }
  };

  const handlePointerUp = () => {
    if (pointerRef.current && !pointerRef.current.moved) {
      onSelect();
    }
    pointerRef.current = null;
  };

  const handlePointerCancel = () => {
    pointerRef.current = null;
  };

  return (
    <div
      role="tab"
      aria-selected={active}
      tabIndex={0}
      data-active={active ? 'true' : undefined}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        'shrink-0 cursor-pointer select-none transition-colors',
        isText
          ? cn(
              'whitespace-nowrap border-b-2 pb-1.5 text-sm',
              active
                ? 'border-[#38c7d0] font-bold text-[#e8edf0]'
                : 'border-transparent font-medium text-[#93a5ad]',
            )
          : cn(
              'rounded-full border px-3.5 py-1.5 text-xs font-semibold touch-manipulation',
              active
                ? 'border-[#38c7d0] bg-[#17343a] text-[#9be2e8] shadow-sm'
                : 'border-[#2b3a42] bg-[#121b20] text-[#b6c2c8] hover:border-[#38c7d0]/40 hover:bg-[#19262d]',
            ),
      )}
    >
      {label}
      {typeof count === 'number' && count > 0 ? (
        <span className={cn('ml-1 tabular-nums', isText ? 'text-[10px] opacity-70' : 'text-[10px]')}>
          {count}
        </span>
      ) : null}
    </div>
  );
}

export default function CategoryQuickChips({
  categories,
  selectedCategory,
  onCategoryChange,
  className,
  variant = 'pill',
  categoryCounts,
}: Props) {
  const { t } = useTranslation();
  const isText = variant === 'text';
  const scrollRef = useRef<HTMLDivElement>(null);

  const selectCategory = useCallback(
    (id: string) => {
      if (id === selectedCategory) return;
      onCategoryChange(id);
    },
    [onCategoryChange, selectedCategory],
  );

  useEffect(() => {
    if (!isText || !scrollRef.current) return;
    const activeEl = scrollRef.current.querySelector('[data-active="true"]');
    activeEl?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [selectedCategory, isText]);

  const tabs = categories.map((cat) => {
    const labelKey = CATEGORY_I18N[cat.id];
    const label = labelKey ? t(labelKey) : categoryDisplayLabel(t, cat.id) || cat.label;
    return (
      <CategoryTab
        key={cat.id}
        active={selectedCategory === cat.id}
        label={label}
        isText={isText}
        onSelect={() => selectCategory(cat.id)}
        count={cat.id === 'all' ? undefined : categoryCounts?.[cat.id]}
      />
    );
  });

  if (isText) {
    return (
      <HorizontalScrollRow
        ref={scrollRef}
        role="tablist"
        aria-label={t('browse.categories.label')}
        bleedInset={2}
        className={cn('pb-0.5', className)}
      >
        {tabs}
      </HorizontalScrollRow>
    );
  }

  return (
    <div
      className={cn(
        'flex gap-2.5 overflow-x-auto pb-2 no-scrollbar -mx-0.5 px-0.5 [touch-action:pan-x]',
        className,
      )}
      role="tablist"
      aria-label={t('browse.categories.label')}
    >
      {tabs}
    </div>
  );
}
