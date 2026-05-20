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
import { conditionMatchesFilter } from '@/lib/vintedCatalog';
import {
  type CatalogFilterState,
  productMatchesCategory,
  serializeCatalogFilters,
  conditionDbValues,
} from '@/lib/catalogFilters';

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
  { id: 'clothing', label: 'Ruházat' },
  { id: 'shoes', label: 'Cipő' },
  { id: 'accessories', label: 'Kiegészítők' },
  { id: 'electronics', label: 'Elektronika' },
  { id: 'other', label: 'Egyéb' },
];

export function useProducts() {
  const { searchQuery, setSearchQuery } = useBrowseSearch();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRevision, setFilterRevision] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('all');
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
      brand: selectedBrand,
      size: selectedSize,
      condition: selectedCondition,
      minPrice: selectedMinPrice,
      maxPrice: selectedMaxPrice,
      sort: selectedSort,
      search: searchQuery,
    }),
    [
      selectedCategory,
      selectedBrand,
      selectedSize,
      selectedCondition,
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

  const setSelectedCategoryWrapped = wrapFilterSetter(setSelectedCategory);
  const setSelectedBrandWrapped = wrapFilterSetter(setSelectedBrand);
  const setSelectedSizeWrapped = wrapFilterSetter(setSelectedSize);
  const setSelectedConditionWrapped = wrapFilterSetter(setSelectedCondition);
  const setSelectedMinPriceWrapped = wrapFilterSetter(setSelectedMinPrice);
  const setSelectedMaxPriceWrapped = wrapFilterSetter(setSelectedMaxPrice);
  const setSelectedSortWrapped = wrapFilterSetter(setSelectedSort);

  const fetchProducts = useCallback(async () => {
    const generation = ++fetchGenRef.current;
    setLoading(true);

    try {
      const sortConfig = SORT_OPTIONS.find((s) => s.id === catalogFilters.sort) ?? SORT_OPTIONS[0];

      let query = supabase
        .from('products')
        .select('*')
        .or('status.eq.active,status.is.null');

      if (catalogFilters.brand !== 'all') {
        query = query.ilike('brand', catalogFilters.brand);
      }

      if (catalogFilters.size !== 'all') {
        query = query.ilike('size', catalogFilters.size);
      }

      if (catalogFilters.condition !== 'all') {
        const condValues = conditionDbValues(catalogFilters.condition);
        if (condValues.length === 1) {
          query = query.eq('condition', condValues[0]);
        } else if (condValues.length > 1) {
          query = query.in('condition', condValues);
        }
      }

      if (catalogFilters.minPrice > 0) {
        query = query.gte('price', catalogFilters.minPrice);
      }

      if (catalogFilters.maxPrice > 0) {
        query = query.lte('price', catalogFilters.maxPrice);
      }

      query = query.order(sortConfig.column, { ascending: sortConfig.order === 'asc' });

      const { data, error } = await query;
      if (error) throw error;
      if (generation !== fetchGenRef.current) return;

      let fetched = ((data || []) as Product[]).filter((p) => isListedProduct(p.status));

      if (catalogFilters.category !== 'all') {
        fetched = fetched.filter((p) =>
          productMatchesCategory(p.category, catalogFilters.category),
        );
      }

      if (catalogFilters.condition !== 'all') {
        fetched = fetched.filter((p) =>
          conditionMatchesFilter(p.condition, catalogFilters.condition),
        );
      }

      if (catalogFilters.search.trim()) {
        const q = catalogFilters.search.trim().toLowerCase();
        fetched = fetched.filter((p) => {
          const brand = (p.brand || '').toLowerCase();
          return (
            p.name.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            brand.includes(q)
          );
        });
      }

      setProducts(fetched);

      const maxPrice = fetched.reduce(
        (max, product) => Math.max(max, Number(product.price) || 0),
        0,
      );
      setMaxPriceLimit(maxPrice);
      setSelectedMaxPrice((prev) => {
        if (prev <= 0) return maxPrice;
        if (maxPrice > 0 && prev > maxPrice) return maxPrice;
        return prev;
      });
    } catch (error) {
      console.error('Error fetching products:', error);
      if (generation === fetchGenRef.current) {
        setProducts([]);
      }
    } finally {
      if (generation === fetchGenRef.current) {
        setLoading(false);
      }
    }
  }, [catalogFilters, filterKey]);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts, filterKey, filterRevision]);

  useEffect(() => {
    void checkUserAndFavorites();
  }, []);

  useEffect(() => {
    const onCatalogRefresh = () => {
      void fetchProducts();
    };
    window.addEventListener(CATALOG_UPDATED_EVENT, onCatalogRefresh);
    return () => window.removeEventListener(CATALOG_UPDATED_EVENT, onCatalogRefresh);
  }, [fetchProducts]);

  useEffect(() => {
    const onProductChange = () => {
      void fetchProducts();
    };

    const channel = supabase
      .channel('catalog-products')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'products' },
        onProductChange,
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'products' },
        onProductChange,
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchProducts]);

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
    if (selectedBrand !== 'all') n++;
    if (selectedSize !== 'all') n++;
    if (selectedCondition !== 'all') n++;
    if (selectedMinPrice > 0) n++;
    if (selectedMaxPrice > 0 && selectedMaxPrice < maxPriceLimit) n++;
    return n;
  }, [
    selectedCategory,
    selectedBrand,
    selectedSize,
    selectedCondition,
    selectedMinPrice,
    selectedMaxPrice,
    maxPriceLimit,
  ]);

  const clearAllFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedBrand('all');
    setSelectedSize('all');
    setSelectedCondition('all');
    setSelectedMinPrice(0);
    setSelectedMaxPrice(maxPriceLimit);
    bumpFilterRevision();
  }, [maxPriceLimit, bumpFilterRevision, setSearchQuery]);

  return {
    allProducts: products,
    products,
    loading,
    filterKey: `${filterKey}:${filterRevision}`,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory: setSelectedCategoryWrapped,
    selectedMinPrice,
    setSelectedMinPrice: setSelectedMinPriceWrapped,
    selectedMaxPrice,
    setSelectedMaxPrice: setSelectedMaxPriceWrapped,
    maxPriceLimit,
    selectedCondition,
    setSelectedCondition: setSelectedConditionWrapped,
    activeFilterCount,
    clearAllFilters,
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
