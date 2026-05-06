'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabase';
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
          price: price,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="w-full max-w-md p-6 rounded-2xl bg-[rgba(30,27,75,0.95)] backdrop-blur-xl border border-white/10 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">Ajánlat küldése</h3>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-white/70 text-sm">Ajánlat küldése a következő termékre:</p>
          <p className="font-semibold mt-1">{productTitle}</p>
          <p className="text-accent font-bold mt-1">{originalPrice.toLocaleString('hu-HU')} Ft</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-white/70 mb-2">Ajánlott ár (Ft)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-accent/50 focus:outline-none transition-colors"
              min="1"
              required
            />

            <div className="flex gap-2 mt-3">
              {[0.7, 0.8, 0.9].map(percent => (
                <button
                  key={percent}
                  type="button"
                  onClick={() => setPrice(Math.round(originalPrice * percent))}
                  className="flex-1 py-2 text-sm rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  {Math.round(percent * 100)}%
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-white/70 mb-2">Üzenet (opcionális)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Írj egy rövid üzenetet az eladónak..."
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-accent/50 focus:outline-none transition-colors resize-none h-24"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-accent to-accent/80 hover:from-accent/90 hover:to-accent/70 transition-all font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Send size={18} />
            {loading ? 'Küldés...' : 'Ajánlat elküldése'}
          </button>
        </form>
      </div>
    </div>
  );
}