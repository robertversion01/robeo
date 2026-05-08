'use client';

interface FiltersProps {
  categories: { id: string; label: string }[];
  selectedCategory: string;
  onCategoryChange: (id: string) => void;
}

export default function Filters({
  categories,
  selectedCategory,
  onCategoryChange,
}: FiltersProps) {
  return (
    <div className="mb-2 border-b border-gray-200 pb-1.5">
      <div className="flex gap-1.5 min-w-max overflow-x-auto no-scrollbar">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
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
    </div>
  );
}
