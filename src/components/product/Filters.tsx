'use client';

interface FiltersProps {
  categories: { id: string; label: string }[];
  selectedCategory: string;
  onCategoryChange: (id: string) => void;
}

export default function Filters({ categories, selectedCategory, onCategoryChange }: FiltersProps) {
  return (
    <div className="sticky top-[64px] z-40 bg-background/95 backdrop-blur-md pt-4 pb-3 mb-6 border-b border-border/50 -mx-4 px-4 md:-mx-8 md:px-8">
      {/* Category tabs */}
      <div className="overflow-x-auto pb-4 scrollbar-hide">
        <div className="flex gap-2 min-w-max">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              className={`px-4 py-1.5 text-sm rounded-full transition-all duration-200 ${
                selectedCategory === category.id
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'bg-muted border border-border hover:bg-muted/80'
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