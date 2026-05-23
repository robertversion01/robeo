'use client';

import CatalogSearchBar from '@/components/browse/CatalogSearchBar';
import CategoryQuickChips from '@/components/browse/CategoryQuickChips';
import type { CatalogFilterState } from '@/lib/catalogFilters';
import { cn } from '@/lib/utils';
import { MOBILE_TAB_PAGE_TOP } from '@/lib/layoutTokens';

type Category = { id: string; label: string };

type Props = {
  title?: string;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  catalogFilters: CatalogFilterState;
  maxPriceLimit: number;
  browsePath: string;
  categories: Category[];
  selectedCategory: string;
  onCategoryChange: (id: string) => void;
  sticky?: boolean;
  className?: string;
  children?: React.ReactNode;
};

/** Hacoo-szerű mobil feed fejléc: safe area → kereső → kategóriák */
export default function MobileFeedChrome({
  title,
  searchQuery,
  onSearchChange,
  catalogFilters,
  maxPriceLimit,
  browsePath,
  categories,
  selectedCategory,
  onCategoryChange,
  sticky = true,
  className,
  children,
}: Props) {
  return (
    <div
      className={cn(
        sticky &&
          cn(
            'sticky top-0 z-40 border-b border-gray-100 bg-white/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/85',
            MOBILE_TAB_PAGE_TOP,
          ),
        'px-0 pb-3 md:static md:border-0 md:bg-transparent md:pb-0 md:pt-0 md:backdrop-blur-none',
        className,
      )}
    >
      {title ? (
        <h1 className="mb-3 text-center text-base font-bold text-gray-900 md:hidden">{title}</h1>
      ) : null}
      <CatalogSearchBar
        value={searchQuery}
        onChange={onSearchChange}
        catalogFilters={catalogFilters}
        maxPriceLimit={maxPriceLimit}
        browsePath={browsePath}
        inputId="mobile-feed-search"
      />
      <div className="mt-3">
        <CategoryQuickChips
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={onCategoryChange}
        />
      </div>
      {children ? <div className="mt-3 space-y-3">{children}</div> : null}
    </div>
  );
}
