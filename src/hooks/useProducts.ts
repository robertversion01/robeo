'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useBrowseSearch } from '@/context/BrowseContext';
import type { Product } from '@/types';

const CATEGORY_ALIASES: Record<string, string[]> = {
  clothing: ['clothing', 'ruhazat', 'ruházat', 'clothes'],
  shoes: ['shoes', 'cipo', 'cipő', 'shoe'],
  accessories: ['accessories', 'kiegeszitok', 'kiegészítők', 'accessory'],
  electronics: ['electronics', 'elektronika', 'electronic'],
  other: ['other', 'egyeb', 'egyéb'],
};

function normalizeCategory(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
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
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedMaxPrice, setSelectedMaxPrice] = useState<number>(0);
  const [selectedSort, setSelectedSort] = useState('newest');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [user, setUser] = useState<any>(null);

  const fetchProducts = useCallback(async () => {
    try {
      const sortConfig = SORT_OPTIONS.find((s) => s.id === selectedSort)!;

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .or('status.is.null,status.neq.deleted')
        .order(sortConfig.column, { ascending: sortConfig.order === 'asc' });

      if (error) throw error;
      const fetchedProducts = (data || []) as Product[];
      setProducts(fetchedProducts);
      const maxPrice = fetchedProducts.reduce(
        (max, product) => Math.max(max, Number(product.price) || 0),
        0
      );
      setSelectedMaxPrice((prev) => (prev > 0 ? prev : maxPrice));
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedSort]);

  useEffect(() => {
    fetchProducts();
    checkUserAndFavorites();
  }, [fetchProducts]);

  useEffect(() => {
    const onCatalogRefresh = () => {
      fetchProducts();
    };
    window.addEventListener('products:updated', onCatalogRefresh);
    return () => window.removeEventListener('products:updated', onCatalogRefresh);
  }, [fetchProducts]);

  const checkUserAndFavorites = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data } = await supabase
          .from('favorites')
          .select('product_id')
          .eq('user_id', user.id);

        if (data) {
          setFavorites(new Set(data.map(f => f.product_id)));
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
    
    // Optimistic update
    setFavorites(prev => {
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
        await supabase
          .from('favorites')
          .insert({
            user_id: user.id,
            product_id: productId
          });
      }
    } catch (error) {
      // Rollback on error
      setFavorites(prev => {
        const next = new Set(prev);
        isFav ? next.add(productId) : next.delete(productId);
        return next;
      });
    }
  };

  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((p) => {
        const brand = (p.brand || '').toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          brand.includes(q)
        );
      });
    }

    if (selectedCategory !== 'all') {
      const aliases = CATEGORY_ALIASES[selectedCategory] || [selectedCategory];
      filtered = filtered.filter((p) => aliases.includes(normalizeCategory(p.category || '')));
    }

    if (selectedMaxPrice > 0) {
      filtered = filtered.filter((p) => (Number(p.price) || 0) <= selectedMaxPrice);
    }

    return filtered;
  }, [products, searchQuery, selectedCategory, selectedMaxPrice]);

  const maxPriceLimit = useMemo(
    () => products.reduce((max, product) => Math.max(max, Number(product.price) || 0), 0),
    [products]
  );

  return {
    allProducts: products,
    products: filteredProducts,
    loading,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedMaxPrice,
    setSelectedMaxPrice,
    maxPriceLimit,
    selectedSort,
    setSelectedSort,
    favorites,
    toggleFavorite,
    sortOptions: SORT_OPTIONS,
    categories: CATEGORIES,
    user
  };
}