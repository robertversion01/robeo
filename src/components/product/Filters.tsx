'use client';

interface FiltersProps {
  categories: { id: string; label: string }[];
  selectedCategory: string;
  onCategoryChange: (id: string) => void;
  selectedMaxPrice: number;
  maxPriceLimit: number;
  onMaxPriceChange: (value: number) => void;
  sortOptions: { id: string; label: string }[];
  selectedSort: string;
  onSortChange: (id: string) => void;
}

export default function Filters({
  categories,
  selectedCategory,
  onCategoryChange,
  selectedMaxPrice,
  maxPriceLimit,
  onMaxPriceChange,
  sortOptions,
  selectedSort,
  onSortChange,
}: FiltersProps) {
  return (
    <div className="space-y-3 pb-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="flex gap-1.5 min-w-0 overflow-x-auto no-scrollbar pb-0.5 -mx-0.5 px-0.5">
          {categories.map((category) => (
            <button
              type="button"
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              aria-pressed={selectedCategory === category.id}
              className={`px-3 h-9 text-xs sm:text-sm rounded-full transition-all duration-200 whitespace-nowrap shrink-0 ${
                selectedCategory === category.id
                  ? 'bg-[#007782] text-white font-medium border border-[#007782]'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 shrink-0 text-xs text-gray-600">
          <span className="hidden sm:inline whitespace-nowrap">Rendezés</span>
          <select
            value={selectedSort}
            onChange={(e) => onSortChange(e.target.value)}
            className="h-9 min-w-[11rem] flex-1 sm:flex-none rounded-full border border-gray-300 bg-white px-3 text-xs sm:text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#007782]"
          >
            {sortOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="px-0.5">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>Max. ár</span>
          <span>{selectedMaxPrice.toLocaleString('hu-HU')} Ft</span>
        </div>
        <input
          type="range"
          min={0}
          max={Math.max(maxPriceLimit, 1)}
          step={500}
          value={selectedMaxPrice}
          onChange={(e) => onMaxPriceChange(Number(e.target.value))}
          className="w-full accent-[#007782] h-2"
        />
      </div>
    </div>
  );
}
