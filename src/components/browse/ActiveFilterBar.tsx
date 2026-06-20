'use client';

import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { type CatalogFilterState, getBudapestDistrictFilter } from '@/lib/catalogFilters';
import { getDistrictLabel } from '@/lib/budapestDistricts';
import { formatConditionLabel } from '@/lib/conditionI18n';
import { VINTED_COLORS } from '@/lib/vintedCategoryTree';
import { departmentLabel, showProductCatalogFilters, subcategoryLabel } from '@/lib/categoryDisplay';

type CategoryOption = { id: string; label: string };
type SortOption = { id: string; label: string };

type Props = {
  filters: CatalogFilterState;
  maxPriceLimit: number;
  categories: CategoryOption[];
  sortOptions: SortOption[];
  onRemove: (key: keyof CatalogFilterState | 'search') => void;
  onClearAll: () => void;
  className?: string;
};

type Chip = {
  key: keyof CatalogFilterState | 'search';
  label: string;
};

function sortLabelKey(id: string) {
  if (id === 'price_asc') return 'browse.sort.priceAsc';
  if (id === 'price_desc') return 'browse.sort.priceDesc';
  return 'browse.sort.newest';
}

export default function ActiveFilterBar({
  filters,
  maxPriceLimit,
  categories,
  sortOptions,
  onRemove,
  onClearAll,
  className,
}: Props) {
  const { t } = useTranslation();
  const showProductFilters = showProductCatalogFilters(filters.listingType);

  const chips: Chip[] = [];

  const search = filters.search.trim();
  if (search) {
    chips.push({ key: 'search', label: `„${search}"` });
  }

  if (filters.listingType && filters.listingType !== 'all') {
    chips.push({
      key: 'listingType',
      label: t(`browse.listingType.${filters.listingType === 'service' ? 'services' : 'products'}`),
    });
  }

  if (filters.category !== 'all') {
    const cat = categories.find((c) => c.id === filters.category);
    chips.push({
      key: 'category',
      label: cat?.label ?? departmentLabel(t, filters.category, filters.category),
    });
  }

  if (filters.subcategory !== 'all') {
    chips.push({
      key: 'subcategory',
      label: subcategoryLabel(t, filters.subcategory),
    });
  }

  if (showProductFilters && filters.brand !== 'all') {
    chips.push({ key: 'brand', label: filters.brand });
  }

  if (showProductFilters && filters.size !== 'all') {
    chips.push({ key: 'size', label: filters.size });
  }

  if (showProductFilters && filters.condition !== 'all') {
    chips.push({
      key: 'condition',
      label: formatConditionLabel(t, filters.condition),
    });
  }

  if (showProductFilters && filters.color !== 'all') {
    const colorDef = VINTED_COLORS.find((c) => c.id === filters.color);
    chips.push({
      key: 'color',
      label: colorDef ? t(colorDef.labelKey) : filters.color,
    });
  }

  if (filters.minPrice > 0) {
    chips.push({
      key: 'minPrice',
      label: t('browse.activeFilters.minPrice', { value: filters.minPrice.toLocaleString() }),
    });
  }

  if (filters.maxPrice > 0 && maxPriceLimit > 0 && filters.maxPrice < maxPriceLimit) {
    chips.push({
      key: 'maxPrice',
      label: t('browse.activeFilters.maxPrice', { value: filters.maxPrice.toLocaleString() }),
    });
  }

  if (filters.sort !== 'newest') {
    const sort = sortOptions.find((s) => s.id === filters.sort);
    chips.push({
      key: 'sort',
      label: sort?.label ?? t(sortLabelKey(filters.sort)),
    });
  }

  const district = getBudapestDistrictFilter(filters);
  if (district) {
    chips.push({
      key: 'budapest_district',
      label: getDistrictLabel(district) || district,
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => onRemove(chip.key)}
          className="inline-flex items-center gap-1 rounded-full border border-[#007782]/30 bg-[#007782]/5 px-2.5 py-1 text-xs font-medium text-[#007782] hover:bg-[#007782]/10"
        >
          <span className="max-w-[140px] truncate">{chip.label}</span>
          <X size={12} className="shrink-0" aria-hidden />
          <span className="sr-only">{t('browse.activeFilters.remove')}</span>
        </button>
      ))}
      {chips.length >= 1 ? (
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs font-semibold text-[#8fa3ad] underline-offset-2 hover:text-[#007782] hover:underline"
        >
          {t('browse.activeFilters.clearAll')}
        </button>
      ) : null}
    </div>
  );
}
