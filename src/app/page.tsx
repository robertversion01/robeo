'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Heart } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string | null;
  created_at: string;
}

const categories = [
  { id: 'all', label: 'Összes' },
  { id: 'clothing', label: 'Ruházat' },
  { id: 'shoes', label: 'Cipő' },
  { id: 'accessories', label: 'Kiegészítők' },
  { id: 'electronics', label: 'Elektronika' },
  { id: 'other', label: 'Egyéb' },
];

const sortOptions = [
  { id: 'newest', label: 'Legújabb előre', column: 'created_at', order: 'desc' },
  { id: 'price_asc', label: 'Legolcsóbb előre', column: 'price', order: 'asc' },
  { id: 'price_desc', label: 'Legdrágább előre', column: 'price', order: 'desc' },
];

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSort, setSelectedSort] = useState('newest');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [user, setUser] = useState<any>(null);

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
        .order(sortConfig.column, { ascending: sortConfig.order === 'asc' });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    return filtered;
  }, [products, searchQuery, selectedCategory]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 to-black text-white">
      <Navbar />

      {/* Search Bar */}
      <div className="max-w-md mx-auto mb-10">
        <div className="relative">
          <input
            type="text"
            placeholder="Keresés a termékek között..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-5 py-3 bg-white/10 border border-white/20 rounded-full focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all placeholder:text-white/40"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40">🔍</div>
        </div>
      </div>

      <main className="pt-36 pb-20 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-7xl font-black tracking-widest mb-4">
              ROBEO
            </h1>
            <p className="text-xl md:text-2xl text-white/70 max-w-xl mx-auto">
              A te stílusod, a te közösséged.
            </p>
          </div>

          {/* Category Tabs */}
          <div className="overflow-x-auto pb-4 mb-6 scrollbar-hide">
            <div className="flex gap-3 min-w-max">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-6 py-2 rounded-full transition-all duration-300 ${
                    selectedCategory === category.id
                      ? 'bg-accent text-black font-medium'
                      : 'bg-white/5 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sort Button */}
          <div className="flex justify-end mb-6 relative">
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="px-5 py-2 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all flex items-center gap-2"
            >
              Rendezés: <span className="text-accent">{sortOptions.find(s => s.id === selectedSort)?.label}</span>
              <span className={`transition-transform ${showSortMenu ? 'rotate-180' : ''}`}>▼</span>
            </button>

            {showSortMenu && (
              <div className="absolute top-full right-0 mt-2 bg-black/90 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden z-10 min-w-[200px]">
                {sortOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => {
                      setSelectedSort(option.id);
                      setShowSortMenu(false);
                    }}
                    className={`w-full text-left px-5 py-3 hover:bg-white/10 transition-colors ${
                      selectedSort === option.id ? 'text-accent' : ''
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-32">
              <div className="animate-spin h-12 w-12 border-4 border-accent border-t-transparent rounded-full"></div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20 text-white/50">
              <p className="text-xl mb-4">Nincs találat a keresési feltételekre</p>
              <p className="text-sm">Próbáld meg más kategóriát vagy keresőkifejezést!</p>
            </div>
          ) : (
            <>
              <p className="text-white/50 mb-6">{filteredProducts.length} találat</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {filteredProducts.map((product) => (
                <div 
                  key={product.id} 
                  className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden hover:bg-white/10 hover:border-accent/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-accent/5 relative"
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
                    onClick={async (e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      
                      if (!user) return;

                      const isFav = favorites.has(product.id);
                      
                      // Optimistic update - change immediately
                      setFavorites(prev => {
                        const next = new Set(prev);
                        isFav ? next.delete(product.id) : next.add(product.id);
                        return next;
                      });

                      try {
                        if (isFav) {
                          // Remove favorite
                          await supabase
                            .from('favorites')
                            .delete()
                            .eq('user_id', user.id)
                            .eq('product_id', product.id);
                        } else {
                          // Add favorite
                          await supabase
                            .from('favorites')
                            .insert({
                              user_id: user.id,
                              product_id: product.id
                            });
                        }
                      } catch (error) {
                        // Rollback on error
                        setFavorites(prev => {
                          const next = new Set(prev);
                          isFav ? next.add(product.id) : next.delete(product.id);
                          return next;
                        });
                        alert('Hiba történt a kedvencek frissítése során');
                      }
                    }}
                    className="absolute top-3 right-3 z-50 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-colors"
                  >
                    <Heart 
                      size={18} 
                      className={favorites.has(product.id) 
                        ? "fill-accent text-accent" 
                        : "fill-transparent text-white"
                      }
                    />
                  </button>

                  <div className="p-4">
                    <div className="text-xs text-accent mb-1 uppercase tracking-wider">
                      {categories.find(c => c.id === product.category)?.label || product.category}
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