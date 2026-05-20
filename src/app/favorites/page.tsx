'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Heart } from 'lucide-react';
import ProductGrid from '@/components/product/ProductGrid';
import FreshOffersStrip from '@/components/home/FreshOffersStrip';
import PageHeader from '@/components/layout/PageHeader';
import FavoritesSortBar, { type FavoritesSortId } from '@/components/favorites/FavoritesSortBar';
import FavoritePriceWatchPanel from '@/components/favorites/FavoritePriceWatchPanel';
import TrustSafetyBlock from '@/components/trust/TrustSafetyBlock';
import { detectPriceDrops } from '@/lib/priceWatch';
import { notifyPriceDropsIfEnabled } from '@/lib/priceWatchNotify';
import type { Product } from '@/types';
import { MAIN_TOP_PADDING, MOBILE_PAGE_BOTTOM_CLASS } from '@/lib/layoutTokens';

type FavoriteRow = {
  product: Product | null;
};

export default function FavoritesPage() {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<FavoritesSortId>('newest');
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
      .select(`product:products(*)`)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    let fetchedProducts: Product[] = [];
    if (error) {
      console.error(error);
    } else {
      fetchedProducts = (((data || []) as FavoriteRow[])
        .map((item) => item?.product)
        .filter(Boolean) as unknown) as Product[];
      setProducts(fetchedProducts);
      setFavorites(new Set(fetchedProducts.map((p) => p.id)));
    }

    setLoading(false);

    if (user && fetchedProducts.length > 0) {
      const hits = detectPriceDrops(
        fetchedProducts.map((p) => ({ id: p.id, name: p.name, price: p.price })),
      );
      void notifyPriceDropsIfEnabled(supabase, user.id, hits);
    }
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

    await supabase.from('favorites').delete().eq('user_id', user.id).eq('product_id', productId);

    setProducts((prev) => prev.filter((p) => p.id !== productId));
    setFavorites((prev) => {
      const next = new Set(prev);
      next.delete(productId);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-4 border-[#007782] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <main className={`${MAIN_TOP_PADDING} pb-20 px-3 md:px-6 md:pb-12`}>
        <div className="max-w-7xl mx-auto">
          <PageHeader title={t('favorites.title')} subtitle={t('favorites.subtitle')} />
          <TrustSafetyBlock variant="compact" className="mb-4" />

          {products.length > 0 ? <FavoritePriceWatchPanel products={products} /> : null}

          {products.length > 0 ? (
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-gray-500 text-sm">{t('favorites.count', { count: products.length })}</p>
              <FavoritesSortBar value={sort} onChange={setSort} />
            </div>
          ) : null}

          {products.length === 0 ? (
            <div className="text-center py-20 px-4">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#007782]/10 text-[#007782]">
                <Heart size={32} strokeWidth={1.5} />
              </div>
              <p className="text-lg font-semibold text-gray-800 mb-2">{t('favorites.empty')}</p>
              <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">{t('favorites.emptyHint')}</p>
              <Link
                href="/browse"
                className="inline-flex items-center justify-center rounded-full bg-[#007782] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#00616b]"
              >
                {t('favorites.browse')}
              </Link>
            </div>
          ) : (
            <ProductGrid
              products={sortedProducts}
              loading={false}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
            />
          )}

          <FreshOffersStrip className="mt-10" />
        </div>
      </main>
    </div>
  );
}
