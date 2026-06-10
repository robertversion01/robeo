'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  VINTED_BRANDS,
  VINTED_CONDITIONS,
} from '@/lib/vintedCatalog';
import { conditionI18nKey } from '@/lib/conditionI18n';
import {
  getSubcategoriesForTaxonomyDepartment,
  sizesForTaxonomy,
} from '@/lib/marketplaceTaxonomy';
import {
  departmentLabel,
  showProductCatalogFilters,
  subcategoryLabel,
} from '@/lib/categoryDisplay';
import { VINTED_COLORS } from '@/lib/vintedCategoryTree';
import FilterChipDropdown from '@/components/product/FilterChipDropdown';

export interface FiltersProps {
  categories: { id: string; label: string }[];
  selectedCategory: string;
  onCategoryChange: (id: string) => void;
  selectedSubcategory: string;
  onSubcategoryChange: (id: string) => void;
  selectedBrand: string;
  onBrandChange: (id: string) => void;
  selectedSize: string;
  onSizeChange: (id: string) => void;
  selectedCondition: string;
  onConditionChange: (id: string) => void;
  selectedColor: string;
  onColorChange: (id: string) => void;
  selectedMinPrice: number;
  selectedMaxPrice: number;
  maxPriceLimit: number;
  onMinPriceChange: (value: number) => void;
  onMaxPriceChange: (value: number) => void;
  sortOptions: { id: string; label: string }[];
  selectedSort: string;
  onSortChange: (id: string) => void;
  onClearAll?: () => void;
  activeFilterCount?: number;
  listingType?: 'all' | 'product' | 'service';
}

function buildCategoryOptions(
  categories: { id: string; label: string }[],
  allLabel: string,
  labelFor: (id: string, fallback: string) => string,
) {
  return [
    { id: 'all', label: allLabel },
    ...categories.filter((c) => c.id !== 'all').map((c) => ({
      id: c.id,
      label: labelFor(c.id, c.label),
    })),
  ];
}

const BRAND_OPTIONS = VINTED_BRANDS.map((b) => ({ id: b, label: b }));

const CONDITION_OPTIONS = VINTED_CONDITIONS.map((c) => ({ id: c.id, labelKey: conditionI18nKey(c.id) }));

const PRICE_PRESET_KEYS = [
  { id: 'all', labelKey: 'browse.filters.anyPrice', min: 0, max: 0 },
  { id: 'under5k', labelKey: 'browse.filters.under5k', min: 0, max: 5000 },
  { id: '5k-15k', labelKey: 'browse.filters.5k15k', min: 5000, max: 15000 },
  { id: '15k-30k', labelKey: 'browse.filters.15k30k', min: 15000, max: 30000 },
  { id: '30k+', labelKey: 'browse.filters.over30k', min: 30000, max: 0 },
] as const;

const PANEL = {
  category: 'category',
  subcategory: 'subcategory',
  brand: 'brand',
  size: 'size',
  condition: 'condition',
  color: 'color',
  price: 'price',
} as const;

export default function Filters({
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
  listingType = 'all',
}: FiltersProps) {
  const { t, i18n } = useTranslation();
  const showProductFilters = showProductCatalogFilters(listingType);
  const [openPanelId, setOpenPanelId] = useState<string | null>(null);
  const priceBtnRef = useRef<HTMLButtonElement>(null);
  const pricePanelRef = useRef<HTMLDivElement>(null);
  const [priceCoords, setPriceCoords] = useState<{ top: number; left: number; minWidth: number } | null>(
    null,
  );
  const [mounted, setMounted] = useState(false);
  const priceInstanceId = useId();

  const pricePresets = useMemo(
    () => PRICE_PRESET_KEYS.map((p) => ({ ...p, label: t(p.labelKey) })),
    [t],
  );

  const categoryOptions = useMemo(
    () =>
      buildCategoryOptions(categories, t('browse.filters.allCategories'), (id, fallback) =>
        departmentLabel(t, id, fallback),
      ),
    [categories, t],
  );

  const brandOptions = useMemo(
    () => [{ id: 'all', label: t('browse.filters.allBrands') }, ...BRAND_OPTIONS],
    [t],
  );

  const conditionOptions = useMemo(
    () => [
      { id: 'all', label: t('browse.filters.allConditions') },
      ...CONDITION_OPTIONS.map((c) => ({ id: c.id, label: t(c.labelKey) })),
    ],
    [t],
  );

  const subcategoryOptions = useMemo(() => {
    const subs = getSubcategoriesForTaxonomyDepartment(selectedCategory);
    return [
      { id: 'all', label: t('browse.filters.allSubcategories') },
      ...subs.map((s) => ({ id: s.id, label: subcategoryLabel(t, s.id) })),
    ];
  }, [selectedCategory, t]);

  const colorOptions = useMemo(
    () => [
      { id: 'all', label: t('browse.filters.allColors') },
      ...VINTED_COLORS.map((c) => ({ id: c.id, label: t(c.labelKey) })),
    ],
    [t],
  );

  const sizeOptions = useMemo(() => {
    const sizes = sizesForTaxonomy(selectedCategory, selectedSubcategory);
    return [{ id: 'all', label: t('browse.filters.allSizes') }, ...sizes.map((s) => ({ id: s, label: s }))];
  }, [selectedCategory, selectedSubcategory, t]);

  const locale = i18n.language?.startsWith('en') ? 'en-HU' : 'hu-HU';

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

  const priceLabel =
    pricePresetId === 'all'
      ? t('browse.filters.price')
      : pricePresetId === 'custom'
        ? `${selectedMinPrice.toLocaleString(locale)} – ${selectedMaxPrice.toLocaleString(locale)} Ft`
        : pricePresets.find((p) => p.id === pricePresetId)?.label ?? t('browse.filters.price');

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

  const priceOpen = openPanelId === PANEL.price;

  const updatePriceCoords = useCallback(() => {
    const btn = priceBtnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const panelWidth = Math.max(rect.width, 256);
    const maxLeft = Math.max(8, window.innerWidth - panelWidth - 8);
    setPriceCoords({
      top: rect.bottom + 6,
      left: Math.min(rect.left, maxLeft),
      minWidth: panelWidth,
    });
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!priceOpen) {
      setPriceCoords(null);
      return;
    }
    updatePriceCoords();
    window.addEventListener('resize', updatePriceCoords);
    window.addEventListener('scroll', updatePriceCoords, true);
    return () => {
      window.removeEventListener('resize', updatePriceCoords);
      window.removeEventListener('scroll', updatePriceCoords, true);
    };
  }, [priceOpen, updatePriceCoords]);

  useEffect(() => {
    if (!priceOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (priceBtnRef.current?.contains(target)) return;
      if (pricePanelRef.current?.contains(target)) return;
      setOpenPanelId(null);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenPanelId(null);
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [priceOpen]);

  const pricePanel =
    priceOpen && priceCoords && mounted ? (
      <div
        ref={pricePanelRef}
        id={`${priceInstanceId}-price-panel`}
        className="fixed z-[10050] w-64 max-w-[calc(100vw-16px)] rounded-xl border border-gray-200 bg-white p-3 shadow-xl"
        style={{ top: priceCoords.top, left: priceCoords.left, minWidth: priceCoords.minWidth }}
      >
        <p className="text-xs font-semibold text-gray-700 mb-2">{t('browse.filters.priceRange')}</p>
        <div className="space-y-1 mb-3">
          {pricePresets.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                applyPricePreset(p.id);
                setOpenPanelId(null);
              }}
              className={`block w-full rounded-lg px-2 py-2 text-left text-xs hover:bg-gray-50 ${
                pricePresetId === p.id ? 'font-semibold text-[#007782]' : 'text-gray-700'
              }`}
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
              className="w-full accent-[#007782]"
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
              className="w-full accent-[#007782]"
            />
          </label>
        </div>
      </div>
    ) : null;

  return (
    <div className="space-y-2 pb-2">
      <div className="flex items-center gap-2 overflow-x-auto overflow-y-visible no-scrollbar pb-1 -mx-0.5 px-0.5">
        <FilterChipDropdown
          panelId={PANEL.category}
          openPanelId={openPanelId}
          onOpenPanelChange={setOpenPanelId}
          label={t('browse.filters.category')}
          options={categoryOptions}
          value={selectedCategory}
          onChange={onCategoryChange}
        />
        {selectedCategory !== 'all' ? (
          <FilterChipDropdown
            panelId={PANEL.subcategory}
            openPanelId={openPanelId}
            onOpenPanelChange={setOpenPanelId}
            label={t('browse.filters.subcategory')}
            options={subcategoryOptions}
            value={selectedSubcategory}
            onChange={onSubcategoryChange}
          />
        ) : null}
        {showProductFilters ? (
        <FilterChipDropdown
          panelId={PANEL.brand}
          openPanelId={openPanelId}
          onOpenPanelChange={setOpenPanelId}
          label={t('browse.filters.brand')}
          options={brandOptions}
          value={selectedBrand}
          onChange={onBrandChange}
        />
        ) : null}
        {showProductFilters ? (
        <FilterChipDropdown
          panelId={PANEL.size}
          openPanelId={openPanelId}
          onOpenPanelChange={setOpenPanelId}
          label={t('browse.filters.size')}
          options={sizeOptions}
          value={selectedSize}
          onChange={onSizeChange}
        />
        ) : null}
        {showProductFilters ? (
        <FilterChipDropdown
          panelId={PANEL.condition}
          openPanelId={openPanelId}
          onOpenPanelChange={setOpenPanelId}
          label={t('browse.filters.condition')}
          options={conditionOptions}
          value={selectedCondition}
          onChange={onConditionChange}
        />
        ) : null}
        {showProductFilters ? (
        <FilterChipDropdown
          panelId={PANEL.color}
          openPanelId={openPanelId}
          onOpenPanelChange={setOpenPanelId}
          label={t('browse.filters.color')}
          options={colorOptions}
          value={selectedColor}
          onChange={onColorChange}
        />
        ) : null}

        <div className="relative shrink-0">
          <button
            ref={priceBtnRef}
            type="button"
            aria-expanded={priceOpen}
            aria-haspopup="dialog"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpenPanelId((prev) => (prev === PANEL.price ? null : PANEL.price));
            }}
            onClick={(e) => e.preventDefault()}
            className={`inline-flex h-9 items-center gap-1 rounded-full border px-3 text-xs font-medium whitespace-nowrap touch-manipulation ${
              priceOpen || pricePresetId !== 'all'
                ? 'border-[#007782] bg-[#007782]/10 text-[#007782]'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {priceLabel}
            <ChevronDown size={14} className={priceOpen ? 'rotate-180' : ''} />
          </button>
        </div>

        <label className="ml-auto shrink-0 flex items-center gap-1.5 text-xs text-gray-600">
          <select
            value={selectedSort}
            onChange={(e) => onSortChange(e.target.value)}
            className="h-9 rounded-full border border-gray-300 bg-white px-3 text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#007782]"
          >
            {sortOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        {activeFilterCount > 0 && onClearAll ? (
          <button
            type="button"
            onClick={onClearAll}
            className="inline-flex h-9 items-center gap-1 rounded-full border border-gray-300 px-3 text-xs text-gray-600 hover:bg-gray-50 shrink-0"
          >
            <X size={14} />
            {t('browse.filters.clearAll', { count: activeFilterCount })}
          </button>
        ) : null}
      </div>
      {pricePanel ? createPortal(pricePanel, document.body) : null}
    </div>
  );
}
