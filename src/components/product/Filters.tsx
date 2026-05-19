'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, X } from 'lucide-react';
import {
  VINTED_BRANDS,
  VINTED_CONDITIONS,
  sizesForCategory,
  CLOTHING_SIZES,
  SHOE_SIZES,
} from '@/lib/vintedCatalog';
import FilterChipDropdown from '@/components/product/FilterChipDropdown';

export interface FiltersProps {
  categories: { id: string; label: string }[];
  selectedCategory: string;
  onCategoryChange: (id: string) => void;
  selectedBrand: string;
  onBrandChange: (id: string) => void;
  selectedSize: string;
  onSizeChange: (id: string) => void;
  selectedCondition: string;
  onConditionChange: (id: string) => void;
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
}

function buildCategoryOptions(categories: { id: string; label: string }[]) {
  return [
    { id: 'all', label: 'Összes kategória' },
    ...categories.filter((c) => c.id !== 'all').map((c) => ({ id: c.id, label: c.label })),
  ];
}

const BRAND_OPTIONS = [
  { id: 'all', label: 'Összes márka' },
  ...VINTED_BRANDS.map((b) => ({ id: b, label: b })),
];

const CONDITION_OPTIONS = [
  { id: 'all', label: 'Összes állapot' },
  ...VINTED_CONDITIONS.map((c) => ({ id: c.id, label: c.label })),
];

const PRICE_PRESETS = [
  { id: 'all', label: 'Bármely ár', min: 0, max: 0 },
  { id: 'under5k', label: '5 000 Ft alatt', min: 0, max: 5000 },
  { id: '5k-15k', label: '5 000 – 15 000 Ft', min: 5000, max: 15000 },
  { id: '15k-30k', label: '15 000 – 30 000 Ft', min: 15000, max: 30000 },
  { id: '30k+', label: '30 000 Ft felett', min: 30000, max: 0 },
] as const;

const PANEL = {
  category: 'category',
  brand: 'brand',
  size: 'size',
  condition: 'condition',
  price: 'price',
} as const;

export default function Filters({
  categories,
  selectedCategory,
  onCategoryChange,
  selectedBrand,
  onBrandChange,
  selectedSize,
  onSizeChange,
  selectedCondition,
  onConditionChange,
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
}: FiltersProps) {
  const [openPanelId, setOpenPanelId] = useState<string | null>(null);
  const priceBtnRef = useRef<HTMLButtonElement>(null);
  const pricePanelRef = useRef<HTMLDivElement>(null);
  const [priceCoords, setPriceCoords] = useState<{ top: number; left: number; minWidth: number } | null>(
    null,
  );
  const [mounted, setMounted] = useState(false);
  const priceInstanceId = useId();

  const categoryOptions = buildCategoryOptions(categories);

  const sizeOptions = (() => {
    const sizes =
      selectedCategory === 'all'
        ? Array.from(new Set([...CLOTHING_SIZES, ...SHOE_SIZES]))
        : [...sizesForCategory(selectedCategory)];
    return [{ id: 'all', label: 'Összes méret' }, ...sizes.map((s) => ({ id: s, label: s }))];
  })();

  const pricePresetId = (() => {
    if (selectedMinPrice === 0 && selectedMaxPrice >= maxPriceLimit) return 'all';
    const match = PRICE_PRESETS.find(
      (p) =>
        p.id !== 'all' &&
        p.min === selectedMinPrice &&
        (p.max === 0 ? selectedMaxPrice >= maxPriceLimit : p.max === selectedMaxPrice),
    );
    return match?.id ?? 'custom';
  })();

  const priceOpen = openPanelId === PANEL.price;

  const priceLabel =
    pricePresetId === 'all'
      ? 'Ár'
      : pricePresetId === 'custom'
        ? `${selectedMinPrice.toLocaleString('hu-HU')} – ${selectedMaxPrice.toLocaleString('hu-HU')} Ft`
        : PRICE_PRESETS.find((p) => p.id === pricePresetId)?.label ?? 'Ár';

  const applyPricePreset = (presetId: string) => {
    const preset = PRICE_PRESETS.find((p) => p.id === presetId);
    if (!preset || preset.id === 'all') {
      onMinPriceChange(0);
      onMaxPriceChange(maxPriceLimit);
      return;
    }
    onMinPriceChange(preset.min);
    onMaxPriceChange(preset.max > 0 ? preset.max : maxPriceLimit);
  };

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
        <p className="text-xs font-semibold text-gray-700 mb-2">Ártartomány</p>
        <div className="space-y-1 mb-3">
          {PRICE_PRESETS.map((p) => (
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
            Min. ({selectedMinPrice.toLocaleString('hu-HU')} Ft)
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
            Max. ({selectedMaxPrice.toLocaleString('hu-HU')} Ft)
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
          label="Kategória"
          options={categoryOptions}
          value={selectedCategory}
          onChange={onCategoryChange}
        />
        <FilterChipDropdown
          panelId={PANEL.brand}
          openPanelId={openPanelId}
          onOpenPanelChange={setOpenPanelId}
          label="Márka"
          options={BRAND_OPTIONS}
          value={selectedBrand}
          onChange={onBrandChange}
        />
        <FilterChipDropdown
          panelId={PANEL.size}
          openPanelId={openPanelId}
          onOpenPanelChange={setOpenPanelId}
          label="Méret"
          options={sizeOptions}
          value={selectedSize}
          onChange={onSizeChange}
        />
        <FilterChipDropdown
          panelId={PANEL.condition}
          openPanelId={openPanelId}
          onOpenPanelChange={setOpenPanelId}
          label="Állapot"
          options={CONDITION_OPTIONS}
          value={selectedCondition}
          onChange={onConditionChange}
        />

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
            Törlés ({activeFilterCount})
          </button>
        ) : null}
      </div>
      {pricePanel ? createPortal(pricePanel, document.body) : null}
    </div>
  );
}
