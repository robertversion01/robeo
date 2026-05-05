'use client';

interface FiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  categories: { id: string; label: string }[];
  selectedCategory: string;
  onCategoryChange: (id: string) => void;
}

export default function Filters({ searchQuery, onSearchChange, categories, selectedCategory, onCategoryChange }: FiltersProps) {
  return (
    <div className="mb-10 space-y-6">
      {/* Search bar */}
      <div className="max-w-md mx-auto">
        <div className="relative">
          <input
            type="text"
            placeholder="Keresés a termékek között..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full px-5 py-3 bg-muted/50 border border-border rounded-full focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all placeholder:text-muted-foreground"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">🔍</div>
        </div>
      </div>

      {/* Category tabs */}
      <div className="overflow-x-auto pb-4 scrollbar-hide">
        <div className="flex gap-3 min-w-max">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              className={`px-6 py-2 rounded-full transition-all duration-300 ${
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