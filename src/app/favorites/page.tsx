'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProductGrid from '@/components/product/ProductGrid';
import type { Product } from '@/types';

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
      const fetchedProducts = ((data || [])
        .map(item => item?.product)
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
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 to-black text-white flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-accent border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 to-black text-white">
      <main className="pt-24 pb-12 px-3 md:px-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">❤️ Kedvenceim</h1>
          <p className="text-white/60 mb-10">Elmentett termékeim</p>

          {products.length === 0 ? (
            <div className="text-center py-20 text-white/50">
              <p className="text-xl mb-4">Még nincsenek kedvenced</p>
              <Link href="/" className="text-accent hover:underline">Nézz körbe a galériában →</Link>
            </div>
          ) : (
            <>
              <p className="text-white/50 mb-6">{products.length} kedvenc termék</p>
              <ProductGrid
                products={products}
                loading={false}
                favorites={favorites}
                onToggleFavorite={toggleFavorite}
              />
            </>
          )}
        </div>
      </main>
    </div>
  );
}