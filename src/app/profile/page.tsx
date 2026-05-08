'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useUserStats } from '@/hooks/useUserStats';
import StarRating from '@/components/review/StarRating';
import OffersList from '@/components/product/OffersList';
import TransactionList from '@/components/profile/TransactionList';
import ProductGrid from '@/components/product/ProductGrid';
import { formatPrice } from '@/lib/utils';
import { getOptimizedImageUrl } from '@/lib/imageUtils';
import type { Product } from '@/types';

export default function ProfilePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [soldProducts, setSoldProducts] = useState<Product[]>([]);
  const [receivedReviews, setReceivedReviews] = useState<Array<{ id: string; rating: number; comment: string | null; created_at: string }>>([]);
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
    loadSoldProducts(user.id);
    loadReceivedReviews(user.id);
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

  const loadSoldProducts = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'sold')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      setSoldProducts((data || []) as Product[]);
    } catch (error) {
      console.error('Error fetching sold products:', error);
    }
  };

  const loadReceivedReviews = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('id, rating, comment, created_at')
        .eq('reviewed_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setReceivedReviews((data || []) as Array<{ id: string; rating: number; comment: string | null; created_at: string }>);
    } catch (error) {
      console.error('Error fetching reviews:', error);
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
      <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-4 border-accent border-t-transparent rounded-full"></div>
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
    <div className="min-h-screen bg-white text-gray-900">
      <main className="pt-16 pb-12 px-3 md:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
              <div className="w-14 h-14 rounded-full bg-[#007782]/10 flex items-center justify-center text-[#007782] text-xl font-bold">
              {user?.email?.charAt(0).toUpperCase() || '?'}
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Profilom</h1>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                <span>Tag since {createdAt ? formatDate(createdAt) : 'now'}</span>
                <span className="w-1 h-1 rounded-full bg-gray-300" />
                <span>{stats.totalProducts} termék</span>
              </div>
            </div>
          </div>
          <p className="text-gray-500 text-sm mb-6 ml-0">Saját feltöltött termékeim</p>

          {/* Tranzakciók */}
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">💰 Tranzakcióim</h2>
            <TransactionList />
          </div>

          {/* Beérkező ajánlatok */}
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">📬 Beérkező ajánlataim</h2>
            <OffersList />
          </div>

          {/* Statistics Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="text-accent text-xs uppercase tracking-wider mb-1">Összes bevétel</div>
              <div className="text-2xl font-bold">{formatPrice(stats.totalRevenue)}</div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="text-accent text-xs uppercase tracking-wider mb-1">Sikeres eladás</div>
              <div className="text-2xl font-bold">{stats.soldProducts} db</div>
              {stats.soldProducts > 0 && stats.totalRevenue > 0 && (
                <div className="text-xs text-gray-400 mt-1">
                  Ø {Math.round(stats.totalRevenue / stats.soldProducts).toLocaleString('hu-HU')} Ft / eladás
                </div>
              )}
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="text-accent text-xs uppercase tracking-wider mb-1">Feltöltött hirdetések</div>
              <div className="text-2xl font-bold">{stats.totalProducts} db</div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="text-accent text-xs uppercase tracking-wider mb-1">Értékelés</div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</span>
                <StarRating rating={stats.averageRating} size={16} />
                <span className="text-gray-400 text-xs">({stats.reviewCount})</span>
              </div>
            </div>
          </div>

          {/* Saját hirdetések */}
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">📦 Saját hirdetéseim</h2>
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
              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs transition-colors"
            >
              Összes törlése
            </button>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-lg mb-3">Még nincs feltöltött terméked</p>
              <Link href="/upload" className="text-accent hover:underline">Töltsd fel az első termékedet →</Link>
            </div>
          ) : (
            <>
              <p className="text-gray-500 text-sm mb-4">{products.length} termék</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {products.map((product) => (
                  <div 
                    key={product.id} 
                    className="group bg-white border border-gray-200 rounded-lg overflow-hidden relative"
                  >
                    <Link href={`/products/${product.id}`} className="aspect-[4/5] overflow-hidden block">
                      {product.image_url ? (
                        <img 
                          src={getOptimizedImageUrl(product.image_url, 300, 85)} 
                          alt={product.name}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                          📷
                        </div>
                      )}
                    </Link>

                    <button
                      onClick={() => deleteProduct(product.id)}
                      className="absolute top-1.5 right-1.5 bg-red-500/90 hover:bg-red-500 text-white px-2 py-0.5 rounded text-[10px] transition-colors"
                    >
                      Törlés
                    </button>

                    <div className="p-1.5 space-y-0.5">
                      <div className="text-gray-500 text-[8px] uppercase tracking-wider">
                        {categoryLabels[product.category] || product.category}
                      </div>
                      <h3 className="font-medium text-[11px] truncate leading-tight text-gray-800">{product.name}</h3>
                      <div className="text-accent font-bold text-xs">{formatPrice(product.price)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="mt-10">
            <h2 className="text-xl font-bold mb-4">✅ Eladott termékeim</h2>
            {soldProducts.length === 0 ? (
              <p className="text-sm text-gray-500">Még nincs eladott termék.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {soldProducts.map((product) => (
                  <Link key={product.id} href={`/products/${product.id}`} className="group bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="aspect-[4/5] overflow-hidden">
                      {product.image_url ? (
                        <img
                          src={getOptimizedImageUrl(product.image_url, 300, 85)}
                          alt={product.name}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">📷</div>
                      )}
                    </div>
                    <div className="p-1.5">
                      <h3 className="font-medium text-[11px] truncate leading-tight text-gray-800">{product.name}</h3>
                      <div className="text-accent font-bold text-xs">{formatPrice(product.price)}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="mt-10">
            <h2 className="text-xl font-bold mb-4">⭐ Kapott értékelések</h2>
            {receivedReviews.length === 0 ? (
              <p className="text-sm text-gray-500">Még nincs értékelésed.</p>
            ) : (
              <div className="space-y-3">
                {receivedReviews.map((review) => (
                  <div key={review.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <StarRating rating={review.rating} size={16} />
                      <span className="text-xs text-gray-500">
                        {new Date(review.created_at).toLocaleDateString('hu-HU')}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="text-sm mt-2 text-gray-700">{review.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}