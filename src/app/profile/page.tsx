'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUserStats } from '@/hooks/useUserStats';
import StarRating from '@/components/review/StarRating';
import OffersList from '@/components/product/OffersList';
import { formatPrice } from '@/lib/utils';
import type { Product } from '@/types';

export default function ProfilePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  
  const { stats, loading: statsLoading } = useUserStats(user?.id);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth');
      return;
    }
    setUser(user);
    loadUserProducts(user.id);
  };

  const loadUserProducts = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (productId: string) => {
    if (!confirm('Biztosan törölni szeretnéd ezt a terméket?')) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;
      setProducts(prev => prev.filter(p => p.id !== productId));
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Hiba történt a törlés során');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 to-black text-white flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-accent border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const categoryLabels: Record<string, string> = {
    clothing: 'Ruházat',
    shoes: 'Cipő',
    accessories: 'Kiegészítők',
    electronics: 'Elektronika',
    other: 'Egyéb'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 to-black text-white">
      <main className="pt-24 pb-12 px-3 md:px-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">Profilom</h1>
          <p className="text-white/60 mb-10">Saját feltöltött termékeim</p>

          {/* Beérkező ajánlatok */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6">📬 Beérkező ajánlataim</h2>
            <OffersList />
          </div>

          {/* Statistics Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
              <div className="text-accent text-sm uppercase tracking-wider mb-1">Összes bevétel</div>
              <div className="text-3xl font-bold">{formatPrice(stats.totalRevenue)}</div>
            </div>

            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
              <div className="text-accent text-sm uppercase tracking-wider mb-1">Sikeres eladás</div>
              <div className="text-3xl font-bold">{stats.soldProducts} db</div>
            </div>

            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
              <div className="text-accent text-sm uppercase tracking-wider mb-1">Feltöltött hirdetések</div>
              <div className="text-3xl font-bold">{stats.totalProducts} db</div>
            </div>

            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
              <div className="text-accent text-sm uppercase tracking-wider mb-1">Értékelés</div>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold">{stats.averageRating.toFixed(1)}</span>
                <StarRating rating={stats.averageRating} size={20} />
                <span className="text-white/50">({stats.reviewCount})</span>
              </div>
            </div>
          </div>

          {/* Saját hirdetések */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-6">📦 Saját hirdetéseim</h2>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-20 text-white/50">
              <p className="text-xl mb-4">Még nincs feltöltött terméked</p>
              <Link href="/upload" className="text-accent hover:underline">Töltsd fel az első termékedet →</Link>
            </div>
          ) : (
            <>
              <p className="text-white/50 mb-6">{products.length} termék</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {products.map((product) => (
                  <div 
                    key={product.id} 
                    className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden relative"
                  >
                    <Link href={`/products/${product.id}`} className="aspect-square overflow-hidden block">
                      {product.image_url ? (
                        <img 
                          src={product.image_url} 
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-white/10 flex items-center justify-center text-white/30">
                          📷
                        </div>
                      )}
                    </Link>

                    <button
                      onClick={() => deleteProduct(product.id)}
                      className="absolute top-3 right-3 bg-red-500/80 hover:bg-red-500 text-white px-3 py-1 rounded-lg text-sm transition-colors"
                    >
                      Törlés
                    </button>

                    <div className="p-2">
                      <div className="text-xs text-accent mb-1 uppercase tracking-wider">
                        {categoryLabels[product.category] || product.category}
                      </div>
                      <h3 className="font-semibold text-lg truncate mb-1">{product.name}</h3>
                      <div className="text-accent font-bold text-xl">{formatPrice(product.price)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}