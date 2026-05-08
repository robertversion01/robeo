'use client';

import { Search } from 'lucide-react';

interface FiltersProps {
  categories: { id: string; label: string }[];
  selectedCategory: string;
  onCategoryChange: (id: string) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

export default function Filters({
  categories,
  selectedCategory,
  onCategoryChange,
  searchQuery,
  onSearchChange,
}: FiltersProps) {
  return (
    <div className="mb-3 border-b border-gray-200 pb-2">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        <div className="relative w-[170px] sm:w-[220px] md:w-[260px] shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
          <input
            type="text"
            placeholder="Keresés..."
            value={searchQuery || ''}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-9 pl-9 pr-3 bg-gray-100 rounded-full text-sm border border-gray-200 focus:outline-none focus:border-[#007782] focus:ring-1 focus:ring-[#007782] transition-colors"
          />
        </div>

        <div className="flex gap-1.5 min-w-max">
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
    </div>
  );
}
