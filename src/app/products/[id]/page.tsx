'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string | null;
  created_at: string;
  user_id: string;
}

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Message Modal State
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!id) return;
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setProduct(data);
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessageToSeller = async () => {
    if (!messageText.trim() || !product) return;
    
    setSendingMessage(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/auth');
        return;
      }

      await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: product.user_id,
          content: messageText,
          product_id: id
        });

      alert('✅ Üzenet elküldve az eladónak! A beszélgetésed az Üzenetek menüben jelenik meg.');
      setMessageText('');
      setShowMessageModal(false);
    } catch (error) {
      console.error(error);
      alert('Hiba történt az üzenet küldése során');
    } finally {
      setSendingMessage(false);
    }
  };

  const categoryLabels: Record<string, string> = {
    clothing: 'Ruházat',
    shoes: 'Cipő',
    accessories: 'Kiegészítők',
    electronics: 'Elektronika',
    other: 'Egyéb'
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 to-black text-white flex items-center justify-center">
        <div className="animate-spin h-16 w-16 border-4 border-accent border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 to-black text-white flex flex-col items-center justify-center">
        <h2 className="text-2xl mb-4">A termék nem található</h2>
        <Link href="/" className="text-accent hover:underline">Vissza a főoldalra</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 to-black text-white">

      {/* Message Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-3xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Üzenet az eladónak</h2>
            <p className="text-white/60 mb-6">Írd meg mit szeretnél kérdezni a termékről!</p>
            
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Üzenet szövege..."
              rows={4}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all resize-none mb-6"
            />

            <div className="flex gap-4">
              <button
                onClick={() => setShowMessageModal(false)}
                className="flex-1 py-3 border border-white/30 rounded-xl hover:bg-white/10 transition-all"
              >
                Mégse
              </button>
              <button
                onClick={sendMessageToSeller}
                disabled={sendingMessage}
                className="flex-1 py-3 bg-accent text-black font-semibold rounded-xl hover:bg-accent/90 transition-all disabled:opacity-50"
              >
                {sendingMessage ? 'Küldés...' : 'Üzenet küldése'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-8 py-5 flex items-center justify-between bg-black/20 backdrop-blur-md border-b border-white/5">
        <Link href="/" className="text-2xl font-bold tracking-wider hover:text-accent transition-colors">ROBEO</Link>
        <div className="flex items-center gap-6">
          <Link href="/messages" className="hover:text-accent transition-colors font-medium">Üzenetek</Link>
          <Link href="/upload" className="hover:text-accent transition-colors font-medium">Termék feltöltése</Link>
          <Link href="/profile" className="hover:text-accent transition-colors font-medium">Profil</Link>
        </div>
      </nav>

      <main className="pt-36 pb-20 px-4 md:px-8">
        <div className="max-w-5xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-8 transition-colors">
            ← Vissza a főoldalra
          </Link>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6 md:p-10">
            {/* Product Image */}
            <div className="aspect-square rounded-2xl overflow-hidden bg-white/5">
              {product.image_url ? (
                <img 
                  src={product.image_url} 
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/30 text-6xl">
                  📷
                </div>
              )}
            </div>

            {/* Product Details */}
            <div className="flex flex-col">
              <div className="text-accent text-sm uppercase tracking-wider mb-2">
                {categoryLabels[product.category] || product.category}
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold mb-4">{product.name}</h1>
              
              <div className="text-accent font-bold text-3xl mb-8">{product.price.toLocaleString()} Ft</div>
              
              <div className="text-white/70 leading-relaxed mb-10 whitespace-pre-line">
                {product.description}
              </div>

              <div className="mt-auto space-y-4">
                <button className="w-full py-4 bg-accent text-black font-semibold rounded-xl hover:bg-accent/90 transition-all duration-300 hover:scale-[1.02] shadow-lg shadow-accent/20">
                  Vásárlás
                </button>
                <button 
                  onClick={() => setShowMessageModal(true)}
                  className="w-full py-4 border-2 border-white font-semibold rounded-xl hover:bg-white hover:text-black transition-all duration-300"
                >
                  Üzenet az eladónak
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}