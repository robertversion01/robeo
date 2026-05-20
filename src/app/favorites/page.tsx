'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import ProductGrid from '@/components/product/ProductGrid';
import FreshOffersStrip from '@/components/home/FreshOffersStrip';
import PageHeader from '@/components/layout/PageHeader';
import type { Product } from '@/types';
import { MAIN_TOP_PADDING } from '@/lib/layoutTokens';

type FavoriteRow = {
  product: Product | null;
};

type SortId = 'newest' | 'price_asc' | 'price_desc';

export default function FavoritesPage() {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<SortId>('newest');
  const router = useRouter();

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push('/auth');
      return;
    }

    const { data, error } = await supabase
      .from('favorites')
      .select(`
        product:products(*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
    } else {
      const fetchedProducts = (((data || []) as FavoriteRow[])
        .map((item) => item?.product)
        .filter(Boolean) as unknown) as Product[];
      setProducts(fetchedProducts);
      setFavorites(new Set(fetchedProducts.map(p => p.id)));
    }
    
    setLoading(false);
  };

  const sortedProducts = useMemo(() => {
    const list = [...products];
    if (sort === 'price_asc') list.sort((a, b) => a.price - b.price);
    else if (sort === 'price_desc') list.sort((a, b) => b.price - a.price);
    return list;
  }, [products, sort]);

  const toggleFavorite = async (productId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('product_id', productId);

    setProducts(prev => prev.filter(p => p.id !== productId));
    setFavorites(prev => {
      const next = new Set(prev);
      next.delete(productId);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-4 border-[#007782] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <main className={`${MAIN_TOP_PADDING} pb-20 px-3 md:px-6 md:pb-12`}>
        <div className="max-w-7xl mx-auto">
          <PageHeader
            title={t('favorites.title')}
            subtitle={t('favorites.subtitle')}
            action={
              products.length > 0 ? (
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortId)}
                  className="h-9 rounded-full border border-gray-300 bg-white px-3 text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#007782]"
                >
                  <option value="newest">{t('favorites.sortNewest')}</option>
                  <option value="price_asc">{t('favorites.sortPriceAsc')}</option>
                  <option value="price_desc">{t('favorites.sortPriceDesc')}</option>
                </select>
              ) : null
            }
          />

          {products.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-lg mb-3">{t('favorites.empty')}</p>
              <Link href="/browse" className="text-[#007782] font-semibold hover:underline">
                {t('favorites.browse')} →
              </Link>
            </div>
          ) : (
            <>
              <p className="text-gray-500 text-sm mb-4">{t('favorites.count', { count: products.length })}</p>
              <ProductGrid
                products={sortedProducts}
                loading={false}
                favorites={favorites}
                onToggleFavorite={toggleFavorite}
              />
            </>
          )}

          <FreshOffersStrip title={t('favorites.similar')} className="mt-10" />
        </div>
      </main>
    </div>
  );
}
