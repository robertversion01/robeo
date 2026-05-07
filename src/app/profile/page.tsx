'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useUserStats } from '@/hooks/useUserStats';
import StarRating from '@/components/review/StarRating';
import OffersList from '@/components/product/OffersList';
import ProductGrid from '@/components/product/ProductGrid';
import { formatPrice } from '@/lib/utils';
import type { Product } from '@/types';

export default function ProfilePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [createdAt, setCreatedAt] = useState<string>('');
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
    setCreatedAt(user.created_at || '');
    loadUserProducts(user.id);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long' });
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
      toast.success('✅ Termék sikeresen törölve!');
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('❌ Hiba történt a törlés során');
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
          <div className="flex items-center gap-4 mb-2">
            <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center text-accent text-2xl font-bold">
              {user?.email?.charAt(0).toUpperCase() || '?'}
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">Profilom</h1>
              <div className="flex items-center gap-2 text-sm text-white/50 mt-1">
                <span>Tag since {createdAt ? formatDate(createdAt) : 'now'}</span>
                <span className="w-1 h-1 rounded-full bg-white/30" />
                <span>{stats.totalProducts} termék</span>
              </div>
            </div>
          </div>
          <p className="text-white/60 mb-10 ml-0">Saját feltöltött termékeim</p>

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
              {stats.soldProducts > 0 && stats.totalRevenue > 0 && (
                <div className="text-xs text-white/40 mt-2">
                  Ø {Math.round(stats.totalRevenue / stats.soldProducts).toLocaleString('hu-HU')} Ft / eladás
                </div>
              )}
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
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold">📦 Saját hirdetéseim</h2>
            <button
              onClick={async () => {
                if (!confirm('Biztosan törölni szeretnéd AZ ÖSSZES termékedet?')) return;
                
                try {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (!user) return;
                  
                  await supabase
                    .from('products')
                    .delete()
                    .eq('user_id', user.id);
                  
                  setProducts([]);
                  toast.success('✅ Minden termék sikeresen törölve!');
                } catch (error) {
                  toast.error('❌ Hiba történt a törlés során');
                }
              }}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl text-sm transition-colors"
            >
              Összes törlése
            </button>
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
                    className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg overflow-hidden relative"
                  >
                    <Link href={`/products/${product.id}`} className="aspect-[4/5] overflow-hidden block">
                      {product.image_url ? (
                        <img 
                          src={product.image_url} 
                          alt={product.name}
                          loading="lazy"
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
                      className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 text-white px-2.5 py-1 rounded-lg text-xs transition-colors"
                    >
                      Törlés
                    </button>

                    <div className="p-1.5">
                      <div className="text-white/50 text-[10px] mb-0.5 uppercase tracking-wider">
                        {categoryLabels[product.category] || product.category}
                      </div>
                      <h3 className="font-medium text-xs truncate">{product.name}</h3>
                      <div className="text-accent font-bold text-sm md:text-base mt-0.5">{formatPrice(product.price)}</div>
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