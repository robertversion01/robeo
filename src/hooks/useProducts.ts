'use client';

import {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { supabase } from '@/lib/supabase';
import { useBrowseSearch } from '@/context/BrowseContext';
import type { Product } from '@/types';
import { CATALOG_UPDATED_EVENT } from '@/lib/catalogRefresh';
import { insertAppNotificationSafe } from '@/lib/supabaseResilience';
import { conditionMatchesFilter } from '@/lib/vintedCatalog';
import { canFilterProductsBySize } from '@/lib/productSchema';
import {
  type CatalogFilterState,
  productMatchesCatalogFilters,
  serializeCatalogFilters,
  conditionDbValues,
} from '@/lib/catalogFilters';
import { VINTED_DEPARTMENTS } from '@/lib/vintedCategoryTree';
import { fetchAllVacationSellerIds } from '@/lib/vacationMode';

/** Szerver-oldali lapozás — Supabase range chunk méret. */
export const CATALOG_PAGE_SIZE = 48;

/** Csak böngészhető, megvásárolható termékek a főlistán. */
function isListedProduct(status: string | null | undefined): boolean {
  if (status === 'sold' || status === 'deleted') return false;
  return status === 'active' || status == null;
}

const SORT_OPTIONS = [
  { id: 'newest', label: 'Legújabb előre', column: 'created_at', order: 'desc' as const },
  { id: 'price_asc', label: 'Legolcsóbb előre', column: 'price', order: 'asc' as const },
  { id: 'price_desc', label: 'Legdrágább előre', column: 'price', order: 'desc' as const },
];

const CATEGORIES = [
  { id: 'all', label: 'Összes' },
  ...VINTED_DEPARTMENTS.map((d) => ({ id: d.id, label: d.id })),
];

export function useProducts() {
  const { searchQuery, setSearchQuery } = useBrowseSearch();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [filterRevision, setFilterRevision] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState('all');
  const [selectedColor, setSelectedColor] = useState('all');
  const [selectedMinPrice, setSelectedMinPrice] = useState(0);
  const [selectedMaxPrice, setSelectedMaxPrice] = useState<number>(0);
  const [maxPriceLimit, setMaxPriceLimit] = useState(0);
  const [selectedSort, setSelectedSort] = useState('newest');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [selectedSize, setSelectedSize] = useState('all');
  const [selectedCondition, setSelectedCondition] = useState('all');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [user, setUser] = useState<any>(null);
  const fetchGenRef = useRef(0);

  const catalogFilters: CatalogFilterState = useMemo(
    () => ({
      category: selectedCategory,
      subcategory: selectedSubcategory,
      brand: selectedBrand,
      size: selectedSize,
      condition: selectedCondition,
      color: selectedColor,
      minPrice: selectedMinPrice,
      maxPrice: selectedMaxPrice,
      sort: selectedSort,
      search: searchQuery,
    }),
    [
      selectedCategory,
      selectedSubcategory,
      selectedBrand,
      selectedSize,
      selectedCondition,
      selectedColor,
      selectedMinPrice,
      selectedMaxPrice,
      selectedSort,
      searchQuery,
    ],
  );

  const filterKey = useMemo(() => serializeCatalogFilters(catalogFilters), [catalogFilters]);

  const bumpFilterRevision = useCallback(() => {
    setFilterRevision((n) => n + 1);
  }, []);

  const wrapFilterSetter = useCallback(
    <T,>(setter: Dispatch<SetStateAction<T>>) =>
      (value: SetStateAction<T>) => {
        setter(value);
        bumpFilterRevision();
      },
    [bumpFilterRevision],
  );

  const setSelectedCategoryWrapped = useCallback(
    (value: SetStateAction<string>) => {
      setSelectedCategory((prev) => {
        const next = typeof value === 'function' ? value(prev) : value;
        if (next !== prev) setSelectedSubcategory('all');
        return next;
      });
      bumpFilterRevision();
    },
    [bumpFilterRevision],
  );
  const setSelectedSubcategoryWrapped = wrapFilterSetter(setSelectedSubcategory);
  const setSelectedColorWrapped = wrapFilterSetter(setSelectedColor);
  const setSelectedBrandWrapped = wrapFilterSetter(setSelectedBrand);
  const setSelectedSizeWrapped = wrapFilterSetter(setSelectedSize);
  const setSelectedConditionWrapped = wrapFilterSetter(setSelectedCondition);
  const setSelectedMinPriceWrapped = wrapFilterSetter(setSelectedMinPrice);
  const setSelectedMaxPriceWrapped = wrapFilterSetter(setSelectedMaxPrice);
  const setSelectedSortWrapped = wrapFilterSetter(setSelectedSort);

  useEffect(() => {
    void supabase
      .from('products')
      .select('price')
      .or('status.eq.active,status.is.null')
      .order('price', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        const p = Math.round(Number(data?.price) || 0);
        if (p > 0) {
          setMaxPriceLimit(p);
          setSelectedMaxPrice((prev) => (prev <= 0 ? p : prev));
        }
      });
  }, []);

  const fetchProductsPage = useCallback(
    async (pageIndex: number, append: boolean) => {
      const generation = ++fetchGenRef.current;
      if (append) setLoadingMore(true);
      else setLoading(true);

      try {
        const sortConfig = SORT_OPTIONS.find((s) => s.id === catalogFilters.sort) ?? SORT_OPTIONS[0];
        const from = pageIndex * CATALOG_PAGE_SIZE;
        const to = from + CATALOG_PAGE_SIZE - 1;

        let query = supabase
          .from('products')
          .select('*', { count: 'exact' })
          .or('status.eq.active,status.is.null');

        if (catalogFilters.brand !== 'all') {
          query = query.ilike('brand', catalogFilters.brand);
        }

        const searchTerm = catalogFilters.search.trim();
        if (searchTerm) {
          const escaped = searchTerm.replace(/[%_\\]/g, '\\$&');
          query = query.or(
            `name.ilike.%${escaped}%,description.ilike.%${escaped}%,brand.ilike.%${escaped}%`,
          );
        }

        let sizeFilterOnServer = false;
        if (catalogFilters.size !== 'all') {
          sizeFilterOnServer = await canFilterProductsBySize(supabase);
          if (sizeFilterOnServer) {
            query = query.ilike('size', catalogFilters.size);
          }
        }

        if (catalogFilters.condition !== 'all') {
          const condValues = conditionDbValues(catalogFilters.condition);
          if (condValues.length === 1) {
            query = query.eq('condition', condValues[0]);
          } else if (condValues.length > 1) {
            query = query.in('condition', condValues);
          }
        }

        if (catalogFilters.color !== 'all') {
          query = query.ilike('color', `%${catalogFilters.color}%`);
        }

        if (catalogFilters.minPrice > 0) {
          query = query.gte('price', catalogFilters.minPrice);
        }

        if (catalogFilters.maxPrice > 0) {
          query = query.lte('price', catalogFilters.maxPrice);
        }

        const vacationIds = await fetchAllVacationSellerIds(supabase);
        if (vacationIds.length > 0) {
          query = query.not('user_id', 'in', `(${vacationIds.join(',')})`);
        }

        query = query.order(sortConfig.column, { ascending: sortConfig.order === 'asc' }).range(from, to);

        const { data, error, count } = await query;
        if (error) throw error;
        if (generation !== fetchGenRef.current) return;

        let fetched = ((data || []) as Product[]).filter((p) => isListedProduct(p.status));

        fetched = fetched.filter((p) => productMatchesCatalogFilters(p, catalogFilters));

        if (catalogFilters.condition !== 'all') {
          fetched = fetched.filter((p) =>
            conditionMatchesFilter(p.condition, catalogFilters.condition),
          );
        }

        if (catalogFilters.size !== 'all' && !sizeFilterOnServer) {
          const sizeQ = catalogFilters.size.toLowerCase();
          fetched = fetched.filter((p) => (p.size || '').toLowerCase().includes(sizeQ));
        }

        setTotalCount(count ?? fetched.length);
        setPage(pageIndex);
        setProducts((prev) => (append ? [...prev, ...fetched] : fetched));
      } catch (error) {
        console.error('Error fetching products:', error);
        if (generation === fetchGenRef.current && !append) {
          setProducts([]);
          setTotalCount(0);
        }
      } finally {
        if (generation === fetchGenRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [catalogFilters],
  );

  useEffect(() => {
    void fetchProductsPage(0, false);
  }, [filterKey, filterRevision, fetchProductsPage]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore) return;
    if (products.length >= totalCount) return;
    await fetchProductsPage(page + 1, true);
  }, [fetchProductsPage, loading, loadingMore, page, products.length, totalCount]);

  const hasMore = products.length < totalCount;

  useEffect(() => {
    void checkUserAndFavorites();
  }, []);

  useEffect(() => {
    const onCatalogRefresh = () => {
      void fetchProductsPage(0, false);
    };
    window.addEventListener(CATALOG_UPDATED_EVENT, onCatalogRefresh);
    return () => window.removeEventListener(CATALOG_UPDATED_EVENT, onCatalogRefresh);
  }, [fetchProductsPage]);

  const fetchProductsRef = useRef(fetchProductsPage);
  fetchProductsRef.current = fetchProductsPage;

  useEffect(() => {
    const channelName = `catalog-products-${Math.random().toString(36).slice(2)}`;

    const channel = supabase.channel(channelName);
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'products' },
      () => {
        void fetchProductsRef.current(0, false);
      },
    );
    channel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'products' },
      () => {
        void fetchProductsRef.current(0, false);
      },
    );
    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const checkUserAndFavorites = async () => {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      setUser(authUser);

      if (authUser) {
        const { data } = await supabase
          .from('favorites')
          .select('product_id')
          .eq('user_id', authUser.id);

        if (data) {
          setFavorites(new Set(data.map((f) => f.product_id)));
        }
      }
    } catch (error) {
      console.error('Error loading user/favorites:', error);
      setUser(null);
    }
  };

  const toggleFavorite = async (productId: string) => {
    if (!user) return;

    const isFav = favorites.has(productId);

    setFavorites((prev) => {
      const next = new Set(prev);
      isFav ? next.delete(productId) : next.add(productId);
      return next;
    });

    try {
      if (isFav) {
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', productId);
      } else {
        await supabase.from('favorites').insert({
          user_id: user.id,
          product_id: productId,
        });
        const favorited = products.find((p) => p.id === productId);
        const sellerId = favorited?.user_id;
        if (sellerId && sellerId !== user.id) {
          void insertAppNotificationSafe(supabase, {
            user_id: sellerId,
            type: 'favorite',
            title: 'Új kedvenc',
            body: `Valaki kedvencelte: ${favorited?.name || 'termék'}`,
            link: `/products/${productId}`,
          });
        }
      }
    } catch {
      setFavorites((prev) => {
        const next = new Set(prev);
        isFav ? next.add(productId) : next.delete(productId);
        return next;
      });
    }
  };

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (selectedCategory !== 'all') n++;
    if (selectedSubcategory !== 'all') n++;
    if (selectedBrand !== 'all') n++;
    if (selectedSize !== 'all') n++;
    if (selectedCondition !== 'all') n++;
    if (selectedColor !== 'all') n++;
    if (selectedMinPrice > 0) n++;
    if (selectedMaxPrice > 0 && selectedMaxPrice < maxPriceLimit) n++;
    return n;
  }, [
    selectedCategory,
    selectedSubcategory,
    selectedBrand,
    selectedSize,
    selectedCondition,
    selectedColor,
    selectedMinPrice,
    selectedMaxPrice,
    maxPriceLimit,
  ]);

  const clearAllFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedSubcategory('all');
    setSelectedBrand('all');
    setSelectedSize('all');
    setSelectedCondition('all');
    setSelectedColor('all');
    setSelectedMinPrice(0);
    setSelectedMaxPrice(maxPriceLimit);
    setSelectedSort('newest');
    bumpFilterRevision();
  }, [maxPriceLimit, bumpFilterRevision, setSearchQuery]);

  const removeFilter = useCallback(
    (key: keyof CatalogFilterState | 'search') => {
      switch (key) {
        case 'search':
          setSearchQuery('');
          break;
        case 'category':
          setSelectedCategory('all');
          setSelectedSubcategory('all');
          break;
        case 'subcategory':
          setSelectedSubcategory('all');
          break;
        case 'brand':
          setSelectedBrand('all');
          break;
        case 'size':
          setSelectedSize('all');
          break;
        case 'condition':
          setSelectedCondition('all');
          break;
        case 'color':
          setSelectedColor('all');
          break;
        case 'minPrice':
          setSelectedMinPrice(0);
          break;
        case 'maxPrice':
          setSelectedMaxPrice(maxPriceLimit);
          break;
        case 'sort':
          setSelectedSort('newest');
          break;
        default:
          break;
      }
      bumpFilterRevision();
    },
    [maxPriceLimit, bumpFilterRevision, setSearchQuery],
  );

  return {
    allProducts: products,
    products,
    loading,
    loadingMore,
    totalCount,
    hasMore,
    loadMore,
    filterKey: `${filterKey}:${filterRevision}`,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory: setSelectedCategoryWrapped,
    selectedSubcategory,
    setSelectedSubcategory: setSelectedSubcategoryWrapped,
    selectedColor,
    setSelectedColor: setSelectedColorWrapped,
    selectedMinPrice,
    setSelectedMinPrice: setSelectedMinPriceWrapped,
    selectedMaxPrice,
    setSelectedMaxPrice: setSelectedMaxPriceWrapped,
    maxPriceLimit,
    selectedCondition,
    setSelectedCondition: setSelectedConditionWrapped,
    activeFilterCount,
    clearAllFilters,
    removeFilter,
    selectedSort,
    setSelectedSort: setSelectedSortWrapped,
    favorites,
    toggleFavorite,
    sortOptions: SORT_OPTIONS,
    categories: CATEGORIES,
    selectedBrand,
    setSelectedBrand: setSelectedBrandWrapped,
    selectedSize,
    setSelectedSize: setSelectedSizeWrapped,
    user,
  };
}
