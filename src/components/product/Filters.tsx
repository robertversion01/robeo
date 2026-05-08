'use client';

interface FiltersProps {
  categories: { id: string; label: string }[];
  selectedCategory: string;
  onCategoryChange: (id: string) => void;
}

export default function Filters({ categories, selectedCategory, onCategoryChange }: FiltersProps) {
  return (
    <div className="sticky top-[60px] z-40 bg-white pt-2 pb-2 mb-4 border-b border-gray-200 -mx-4 px-4 md:-mx-8 md:px-8">
      {/* Category tabs */}
      <div className="overflow-x-auto no-scrollbar">
        <div className="flex gap-1.5 min-w-max">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              className={`px-3 py-2 text-sm rounded-full transition-all duration-200 whitespace-nowrap ${
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
    </div>
  );
}
