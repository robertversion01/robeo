'use client';

import CatalogSearchBar from '@/components/browse/CatalogSearchBar';
import CategoryQuickChips from '@/components/browse/CategoryQuickChips';
import type { CatalogFilterState } from '@/lib/catalogFilters';
import { cn } from '@/lib/utils';
import { MOBILE_TAB_PAGE_TOP } from '@/lib/layoutTokens';

type Category = { id: string; label: string };

type Props = {
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

/** Mobil feed fejléc: safe area → kompakt kereső → lapozható kategória sor */
export default function MobileFeedChrome({
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
            'sticky top-0 z-40 min-w-0 max-w-full overflow-x-visible border-b border-[#27363d] bg-[#11171a]/98 backdrop-blur-sm',
            MOBILE_TAB_PAGE_TOP,
          ),
        'pb-2 md:static md:border-0 md:bg-transparent md:pb-0 md:pt-0',
        className,
      )}
    >
      <CatalogSearchBar
        compact
        value={searchQuery}
        onChange={onSearchChange}
        catalogFilters={catalogFilters}
        maxPriceLimit={maxPriceLimit}
        browsePath={browsePath}
        inputId="mobile-feed-search"
      />
      <div className="mt-2">
        <CategoryQuickChips
          variant="text"
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={onCategoryChange}
        />
      </div>
      {children ? <div className="mt-2 space-y-2">{children}</div> : null}
    </div>
  );
}
