'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { X, Send } from 'lucide-react';

interface OfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  sellerId: string;
  productTitle: string;
  originalPrice: number;
}

export default function OfferModal({ isOpen, onClose, productId, sellerId, productTitle, originalPrice }: OfferModalProps) {
  const [price, setPrice] = useState<number>(Math.round(originalPrice * 0.85));
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (price <= 0) {
      toast.error('Kérlek adj meg egy érvényes árat!');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Először be kell jelentkezned!');
        return;
      }

      if (user.id === sellerId) {
        toast.error('Nem küldhetsz ajánlatot a saját termékedre!');
        return;
      }

      const { error } = await supabase
        .from('offers')
        .insert({
          product_id: productId,
          buyer_id: user.id,
          seller_id: sellerId,
          offered_price: price,
          price: price, // Adding price field to fix the null value error
          message: message,
          status: 'pending'
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('Már küldtél ajánlatot erre a termékre!');
        } else {
          throw error;
        }
      } else {
        // Send automatic system message to chat
        try {
          await supabase
            .from('messages')
            .insert({
              sender_id: user.id,
              receiver_id: sellerId,
              content: `🔔 Új ajánlat érkezett: ${price.toLocaleString('hu-HU')} Ft`,
              product_id: productId,
              is_system_message: true
            });
        } catch {
          // Ignore duplicate/conflict error for system message
        }

        toast.success('✅ Ajánlat sikeresen elküldve! Az eladó hamarosan válaszol.');
        onClose();
      }

    } catch (error: any) {
      toast.error('Hiba történt az ajánlat küldése közben: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="w-full max-w-md p-5 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Ajánlat küldése</h3>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mb-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400 text-xs">Ajánlat küldése a következő termékre:</p>
          <p className="font-semibold mt-1 text-gray-900 dark:text-white text-sm">{productTitle}</p>
          <p className="text-accent font-bold mt-1">{originalPrice.toLocaleString('hu-HU')} Ft</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1.5">Ajánlott ár (Ft)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 focus:border-accent focus:outline-none transition-colors text-gray-900 dark:text-white"
              min="1"
              required
            />

            <div className="flex gap-1.5 mt-2">
              {[0.7, 0.8, 0.9].map(percent => (
                <button
                  key={percent}
                  type="button"
                  onClick={() => setPrice(Math.round(originalPrice * percent))}
                  className="flex-1 py-1.5 text-xs rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-800 dark:text-gray-200"
                >
                  {Math.round(percent * 100)}%
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1.5">Üzenet (opcionális)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Írj egy rövid üzenetet az eladónak..."
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 focus:border-accent focus:outline-none transition-colors resize-none h-20 text-gray-900 dark:text-white text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-accent hover:bg-accent/90 transition-all font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50 text-white text-sm"
          >
            <Send size={16} />
            {loading ? 'Küldés...' : 'Ajánlat elküldése'}
          </button>
        </form>
      </div>
    </div>
  );
}