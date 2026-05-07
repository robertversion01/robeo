'use client';

interface FiltersProps {
  categories: { id: string; label: string }[];
  selectedCategory: string;
  onCategoryChange: (id: string) => void;
}

export default function Filters({ categories, selectedCategory, onCategoryChange }: FiltersProps) {
  return (
    <div className="sticky top-[60px] z-40 bg-white dark:bg-background/95 backdrop-blur-md pt-2 pb-2 mb-4 border-b border-gray-200 dark:border-border/50 -mx-4 px-4 md:-mx-8 md:px-8">
      {/* Category tabs */}
      <div className="overflow-x-auto no-scrollbar">
        <div className="flex gap-1.5 min-w-max">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              className={`px-3 py-1.5 text-xs rounded-full transition-all duration-200 ${
                selectedCategory === category.id
                  ? 'bg-accent text-white font-medium'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
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
