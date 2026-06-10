'use client';

import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  VINTED_BRANDS,
  VINTED_CONDITIONS,
} from '@/lib/vintedCatalog';
import { conditionI18nKey } from '@/lib/conditionI18n';
import {
  sizesForDepartment,
  VINTED_COLORS,
} from '@/lib/vintedCategoryTree';
import { getSubcategoriesForTaxonomyDepartment } from '@/lib/marketplaceTaxonomy';
import {
  departmentLabel,
  showProductCatalogFilters,
  subcategoryLabel,
} from '@/lib/categoryDisplay';
import { cn } from '@/lib/utils';
import type { FiltersProps } from '@/components/product/Filters';
import { useCatalogFilterCounts } from '@/hooks/useCatalogFilterCounts';

type Props = FiltersProps & {
  className?: string;
  catalogFilters?: import('@/lib/catalogFilters').CatalogFilterState;
};

function SidebarSection({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('border-t border-gray-200/80 pt-4 first:border-t-0 first:pt-0', className)}>
      <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wide text-gray-700">{title}</h3>
      {children}
    </section>
  );
}

function SidebarRadio({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors',
        active
          ? 'bg-[#007782]/10 font-semibold text-[#007782]'
          : 'text-gray-700 hover:bg-gray-100',
      )}
    >
      <span
        className={cn(
          'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2',
          active ? 'border-[#007782]' : 'border-gray-300',
        )}
        aria-hidden
      >
        {active ? <span className="h-2 w-2 rounded-full bg-[#007782]" /> : null}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {typeof count === 'number' ? (
        <span className="shrink-0 text-[11px] tabular-nums text-gray-400">{count}</span>
      ) : null}
    </button>
  );
}

const PRICE_PRESET_KEYS = [
  { id: 'all', labelKey: 'browse.filters.anyPrice', min: 0, max: 0 },
  { id: 'under5k', labelKey: 'browse.filters.under5k', min: 0, max: 5000 },
  { id: '5k-15k', labelKey: 'browse.filters.5k15k', min: 5000, max: 15000 },
  { id: '15k-30k', labelKey: 'browse.filters.15k30k', min: 15000, max: 30000 },
  { id: '30k+', labelKey: 'browse.filters.over30k', min: 30000, max: 0 },
] as const;

/** Allegro-szerű bal oldali szűrőpanel — csak desktop /browse. */
export default function CatalogFilterSidebar({
  categories,
  selectedCategory,
  onCategoryChange,
  selectedSubcategory,
  onSubcategoryChange,
  selectedBrand,
  onBrandChange,
  selectedSize,
  onSizeChange,
  selectedCondition,
  onConditionChange,
  selectedColor,
  onColorChange,
  selectedMinPrice,
  selectedMaxPrice,
  maxPriceLimit,
  onMinPriceChange,
  onMaxPriceChange,
  sortOptions,
  selectedSort,
  onSortChange,
  onClearAll,
  activeFilterCount = 0,
  className,
  catalogFilters,
}: Props) {
  const { t, i18n } = useTranslation();
  const [brandQuery, setBrandQuery] = useState('');
  const locale = i18n.language?.startsWith('en') ? 'en-HU' : 'hu-HU';

  const listingType = catalogFilters?.listingType ?? 'all';
  const showProductFilters = showProductCatalogFilters(listingType);

  const categoryOptions = useMemo(
    () => [
      { id: 'all', label: t('browse.filters.allCategories') },
      ...categories.filter((c) => c.id !== 'all').map((c) => ({
        id: c.id,
        label: departmentLabel(t, c.id, c.label),
      })),
    ],
    [categories, t],
  );

  const brandOptions = useMemo(() => {
    const q = brandQuery.trim().toLowerCase();
    const list = VINTED_BRANDS.filter((b) => !q || b.toLowerCase().includes(q));
    return list.slice(0, q ? 24 : 14);
  }, [brandQuery]);

  const subcategoryOptions = useMemo(() => {
    const subs = getSubcategoriesForTaxonomyDepartment(selectedCategory);
    return [
      { id: 'all', label: t('browse.filters.allSubcategories') },
      ...subs.map((s) => ({ id: s.id, label: subcategoryLabel(t, s.id) })),
    ];
  }, [selectedCategory, t]);

  const sizeOptions = useMemo(() => {
    return [...sizesForDepartment(selectedCategory, selectedSubcategory)];
  }, [selectedCategory, selectedSubcategory]);

  const conditionOptions = useMemo(
    () => [
      { id: 'all', label: t('browse.filters.allConditions') },
      ...VINTED_CONDITIONS.map((c) => ({
        id: c.id,
        label: t(conditionI18nKey(c.id)),
      })),
    ],
    [t],
  );

  const pricePresets = useMemo(
    () => PRICE_PRESET_KEYS.map((p) => ({ ...p, label: t(p.labelKey) })),
    [t],
  );

  const filterCounts = useCatalogFilterCounts(
    catalogFilters ?? {
      listingType: 'all',
      category: selectedCategory,
      subcategory: selectedSubcategory,
      brand: selectedBrand,
      size: selectedSize,
      condition: selectedCondition,
      color: selectedColor,
      minPrice: selectedMinPrice,
      maxPrice: selectedMaxPrice,
      sort: selectedSort,
      search: '',
    },
    categoryOptions.map((o) => o.id),
    subcategoryOptions.map((o) => o.id),
    brandOptions,
  );

  const pricePresetId = (() => {
    if (selectedMinPrice === 0 && selectedMaxPrice >= maxPriceLimit) return 'all';
    const match = pricePresets.find(
      (p) =>
        p.id !== 'all' &&
        p.min === selectedMinPrice &&
        (p.max === 0 ? selectedMaxPrice >= maxPriceLimit : p.max === selectedMaxPrice),
    );
    return match?.id ?? 'custom';
  })();

  const applyPricePreset = (presetId: string) => {
    const preset = pricePresets.find((p) => p.id === presetId);
    if (!preset || preset.id === 'all') {
      onMinPriceChange(0);
      onMaxPriceChange(maxPriceLimit);
      return;
    }
    onMinPriceChange(preset.min);
    onMaxPriceChange(preset.max > 0 ? preset.max : maxPriceLimit);
  };

  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200 bg-white shadow-sm',
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h2 className="text-sm font-bold text-gray-900">{t('browse.sidebar.title')}</h2>
        {activeFilterCount > 0 && onClearAll ? (
          <button
            type="button"
            onClick={onClearAll}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#007782] hover:underline"
          >
            <X size={12} />
            {t('browse.sidebar.reset')}
          </button>
        ) : null}
      </div>

      <div className="max-h-[calc(100dvh-8rem)] overflow-y-auto px-4 py-3 space-y-1">
        <SidebarSection title={t('browse.filters.category')}>
          <div className="space-y-0.5">
            {categoryOptions.map((opt) => (
              <SidebarRadio
                key={opt.id}
                active={selectedCategory === opt.id}
                label={opt.label}
                count={filterCounts.categories[opt.id]}
                onClick={() => onCategoryChange(opt.id)}
              />
            ))}
          </div>
        </SidebarSection>

        {selectedCategory !== 'all' ? (
          <SidebarSection title={t('browse.filters.subcategory')}>
            <div className="max-h-48 space-y-0.5 overflow-y-auto">
              {subcategoryOptions.map((opt) => (
                <SidebarRadio
                  key={opt.id}
                  active={selectedSubcategory === opt.id}
                  label={opt.label}
                  count={filterCounts.subcategories[opt.id]}
                  onClick={() => onSubcategoryChange(opt.id)}
                />
              ))}
            </div>
          </SidebarSection>
        ) : null}

        {showProductFilters ? (
          <>
        <SidebarSection title={t('browse.filters.brand')}>
          <div className="relative mb-2">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={brandQuery}
              onChange={(e) => setBrandQuery(e.target.value)}
              placeholder={t('browse.sidebar.searchBrand')}
              className="h-9 w-full rounded-lg border border-gray-200 pl-8 pr-2 text-xs"
            />
          </div>
          <div className="max-h-44 space-y-0.5 overflow-y-auto">
            <SidebarRadio
              active={selectedBrand === 'all'}
              label={t('browse.filters.allBrands')}
              onClick={() => onBrandChange('all')}
            />
            {brandOptions.map((brand) => (
              <SidebarRadio
                key={brand}
                active={selectedBrand === brand}
                label={brand}
                count={filterCounts.brands[brand]}
                onClick={() => onBrandChange(brand)}
              />
            ))}
          </div>
        </SidebarSection>

        <SidebarSection title={t('browse.filters.size')}>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => onSizeChange('all')}
              className={cn(
                'rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors',
                selectedSize === 'all'
                  ? 'border-[#007782] bg-[#007782] text-white'
                  : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-[#007782]/40',
              )}
            >
              {t('browse.filters.allSizes')}
            </button>
            {sizeOptions.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => onSizeChange(size)}
                className={cn(
                  'min-w-[2.25rem] rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors',
                  selectedSize === size
                    ? 'border-[#007782] bg-[#007782] text-white'
                    : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-[#007782]/40',
                )}
              >
                {size}
              </button>
            ))}
          </div>
        </SidebarSection>

        <SidebarSection title={t('browse.filters.condition')}>
          <div className="space-y-0.5">
            {conditionOptions.map((opt) => (
              <SidebarRadio
                key={opt.id}
                active={selectedCondition === opt.id}
                label={opt.label}
                onClick={() => onConditionChange(opt.id)}
              />
            ))}
          </div>
        </SidebarSection>

        <SidebarSection title={t('browse.filters.color')}>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => onColorChange('all')}
              className={cn(
                'rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors',
                selectedColor === 'all'
                  ? 'border-[#007782] bg-[#007782] text-white'
                  : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-[#007782]/40',
              )}
            >
              {t('browse.filters.allColors')}
            </button>
            {VINTED_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onColorChange(c.id)}
                className={cn(
                  'rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors',
                  selectedColor === c.id
                    ? 'border-[#007782] bg-[#007782] text-white'
                    : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-[#007782]/40',
                )}
              >
                {t(c.labelKey)}
              </button>
            ))}
          </div>
        </SidebarSection>
          </>
        ) : null}

        <SidebarSection title={t('browse.filters.price')}>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {pricePresets.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPricePreset(p.id)}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                  pricePresetId === p.id
                    ? 'border-[#007782] bg-[#007782]/10 text-[#007782]'
                    : 'border-gray-200 text-gray-600 hover:border-[#007782]/30',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="space-y-2 text-xs text-gray-600">
            <label className="block">
              {t('browse.filters.min')} ({selectedMinPrice.toLocaleString(locale)} Ft)
              <input
                type="range"
                min={0}
                max={maxPriceLimit}
                step={500}
                value={selectedMinPrice}
                onChange={(e) => onMinPriceChange(Number(e.target.value))}
                className="mt-1 w-full accent-[#007782]"
              />
            </label>
            <label className="block">
              {t('browse.filters.max')} ({selectedMaxPrice.toLocaleString(locale)} Ft)
              <input
                type="range"
                min={0}
                max={Math.max(maxPriceLimit, 1)}
                step={500}
                value={selectedMaxPrice}
                onChange={(e) => onMaxPriceChange(Number(e.target.value))}
                className="mt-1 w-full accent-[#007782]"
              />
            </label>
          </div>
        </SidebarSection>

        <SidebarSection title={t('browse.sidebar.sort')}>
          <select
            value={selectedSort}
            onChange={(e) => onSortChange(e.target.value)}
            className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#007782]/30"
          >
            {sortOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </SidebarSection>
      </div>
    </div>
  );
}
