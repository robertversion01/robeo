'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { Product } from '@/types';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSort, setSelectedSort] = useState('newest');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [user, setUser] = useState<any>(null);

  const sortOptions = [
    { id: 'newest', label: 'Legújabb előre', column: 'created_at', order: 'desc' },
    { id: 'price_asc', label: 'Legolcsóbb előre', column: 'price', order: 'asc' },
    { id: 'price_desc', label: 'Legdrágább előre', column: 'price', order: 'desc' },
  ];

  const categories = [
    { id: 'all', label: 'Összes' },
    { id: 'clothing', label: 'Ruházat' },
    { id: 'shoes', label: 'Cipő' },
    { id: 'accessories', label: 'Kiegészítők' },
    { id: 'electronics', label: 'Elektronika' },
    { id: 'other', label: 'Egyéb' },
  ];

  useEffect(() => {
    fetchProducts();
    checkUserAndFavorites();
  }, [selectedSort]);

  const checkUserAndFavorites = async () => {
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
  };

  const fetchProducts = async () => {
    try {
      const sortConfig = sortOptions.find(s => s.id === selectedSort)!;

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .in('status', ['active'])
        .order(sortConfig.column, { ascending: sortConfig.order === 'asc' });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
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
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    return filtered;
  }, [products, searchQuery, selectedCategory]);

  return {
    products: filteredProducts,
    loading,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedSort,
    setSelectedSort,
    favorites,
    toggleFavorite,
    sortOptions,
    categories,
    user
  };
}