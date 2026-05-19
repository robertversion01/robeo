'use client';

import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
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
  const [pricePanelOpen, setPricePanelOpen] = useState(false);

  const categoryOptions = useMemo(() => buildCategoryOptions(categories), [categories]);

  const sizeOptions = useMemo(() => {
    const sizes =
      selectedCategory === 'all'
        ? Array.from(new Set([...CLOTHING_SIZES, ...SHOE_SIZES]))
        : [...sizesForCategory(selectedCategory)];
    return [{ id: 'all', label: 'Összes méret' }, ...sizes.map((s) => ({ id: s, label: s }))];
  }, [selectedCategory]);

  const pricePresetId = useMemo(() => {
    if (selectedMinPrice === 0 && selectedMaxPrice >= maxPriceLimit) return 'all';
    const match = PRICE_PRESETS.find(
      (p) =>
        p.id !== 'all' &&
        p.min === selectedMinPrice &&
        (p.max === 0 ? selectedMaxPrice >= maxPriceLimit : p.max === selectedMaxPrice),
    );
    return match?.id ?? 'custom';
  }, [selectedMinPrice, selectedMaxPrice, maxPriceLimit]);

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

  return (
    <div className="space-y-2 pb-2">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
        <FilterChipDropdown
          label="Kategória"
          options={categoryOptions}
          value={selectedCategory}
          onChange={onCategoryChange}
        />
        <FilterChipDropdown
          label="Márka"
          options={BRAND_OPTIONS}
          value={selectedBrand}
          onChange={onBrandChange}
        />
        <FilterChipDropdown
          label="Méret"
          options={sizeOptions}
          value={selectedSize}
          onChange={onSizeChange}
        />
        <FilterChipDropdown
          label="Állapot"
          options={CONDITION_OPTIONS}
          value={selectedCondition}
          onChange={onConditionChange}
        />

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setPricePanelOpen((v) => !v)}
            className={`inline-flex h-9 items-center gap-1 rounded-full border px-3 text-xs font-medium whitespace-nowrap ${
              pricePresetId !== 'all'
                ? 'border-[#007782] bg-[#007782]/10 text-[#007782]'
                : 'border-gray-300 bg-white text-gray-700'
            }`}
          >
            {priceLabel}
          </button>
          {pricePanelOpen ? (
            <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
              <p className="text-xs font-semibold text-gray-700 mb-2">Ártartomány</p>
              <div className="space-y-1 mb-3">
                {PRICE_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      applyPricePreset(p.id);
                      setPricePanelOpen(false);
                    }}
                    className={`block w-full rounded-lg px-2 py-1.5 text-left text-xs hover:bg-gray-50 ${
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
          ) : null}
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
    </div>
  );
}
