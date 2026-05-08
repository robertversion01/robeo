'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProductGrid from '@/components/product/ProductGrid';
import FreshOffersStrip from '@/components/home/FreshOffersStrip';
import type { Product } from '@/types';

type FavoriteRow = {
  product: Product | null;
};

export default function FavoritesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
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
        <div className="animate-spin h-10 w-10 border-4 border-accent border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <main className="pt-14 pb-12 px-3 md:px-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold mb-0.5">❤️ Kedvenceim</h1>
          <p className="text-gray-500 text-sm mb-5">Elmentett termékeim</p>

          {products.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-lg mb-3">Még nincsenek kedvenced</p>
              <Link href="/" className="text-accent hover:underline">Nézz körbe a galériában →</Link>
            </div>
          ) : (
            <>
              <p className="text-gray-500 text-sm mb-4">{products.length} kedvenc termék</p>
              <ProductGrid
                products={products}
                loading={false}
                favorites={favorites}
                onToggleFavorite={toggleFavorite}
              />
            </>
          )}

          <FreshOffersStrip title="Hasonló termékek" className="mt-10" />
        </div>
      </main>
    </div>
  );
}