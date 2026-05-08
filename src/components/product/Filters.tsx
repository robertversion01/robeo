'use client';

interface FiltersProps {
  categories: { id: string; label: string }[];
  selectedCategory: string;
  onCategoryChange: (id: string) => void;
  selectedMaxPrice: number;
  maxPriceLimit: number;
  onMaxPriceChange: (value: number) => void;
}

export default function Filters({
  categories,
  selectedCategory,
  onCategoryChange,
  selectedMaxPrice,
  maxPriceLimit,
  onMaxPriceChange,
}: FiltersProps) {
  return (
    <div className="mb-2 border-b border-gray-200 pb-1.5">
      <div className="flex gap-1.5 min-w-max overflow-x-auto no-scrollbar">
        {categories.map((category) => (
          <button
            type="button"
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            aria-pressed={selectedCategory === category.id}
            className={`px-3 h-9 text-xs sm:text-sm rounded-full transition-all duration-200 whitespace-nowrap ${
              selectedCategory === category.id
                ? 'bg-[#007782] text-white font-medium border border-[#007782]'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {category.label}
          </button>
        ))}
      </div>
      <div className="mt-3 px-0.5">
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
          className="w-full accent-[#007782]"
        />
      </div>
    </div>
  );
}
