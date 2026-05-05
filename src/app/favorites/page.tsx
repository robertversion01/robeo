'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image_url: string | null;
}

export default function FavoritesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
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
      setProducts(
        ((data || [])
          .map(item => item?.product)
          .filter(Boolean) as unknown) as Product[]
      );
    }
    
    setLoading(false);
  };

  const removeFavorite = async (productId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('product_id', productId);

    setProducts(prev => prev.filter(p => p.id !== productId));
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
      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-8 py-5 flex items-center justify-between bg-black/20 backdrop-blur-md border-b border-white/5">
        <Link href="/" className="text-2xl font-bold tracking-wider hover:text-accent transition-colors">ROBEO</Link>
        <div className="flex items-center gap-6">
          <Link href="/messages" className="hover:text-accent transition-colors font-medium">Üzenetek</Link>
          <Link href="/favorites" className="text-accent font-medium">Kedvencek</Link>
          <Link href="/upload" className="hover:text-accent transition-colors font-medium">Termék feltöltése</Link>
          <Link href="/profile" className="hover:text-accent transition-colors font-medium">Profil</Link>
        </div>
      </nav>

      <main className="pt-36 pb-20 px-4 md:px-8">
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
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
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
                      onClick={() => removeFavorite(product.id)}
                      className="absolute top-3 right-3 bg-accent text-black w-8 h-8 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                    >
                      ❤
                    </button>

                    <div className="p-4">
                      <div className="text-xs text-accent mb-1 uppercase tracking-wider">
                        {categoryLabels[product.category] || product.category}
                      </div>
                      <h3 className="font-semibold text-lg truncate mb-1">{product.name}</h3>
                      <div className="text-accent font-bold text-xl">{product.price.toLocaleString()} Ft</div>
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