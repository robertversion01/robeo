'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Check, X, Clock } from 'lucide-react';

interface Offer {
  id: string;
  price: number;
  message: string | null;
  status: string;
  created_at: string;
  buyer_id: string;
  product: {
    id: string;
    name: string;
    price: number;
    image_url: string | null;
  };
}

export default function OffersList() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOffers();

    // Real-time subscription
    const channel = supabase.channel('offers-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'offers' }, () => {
        fetchOffers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchOffers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('offers')
        .select(`
          id,
          price,
          status,
          created_at,
          buyer_id,
          product:products(id, name, price, image_url)
        `)
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      // @ts-ignore - Supabase returns different format than types expect
      setOffers(data || []);
    } catch (error: any) {
      console.error("Supabase Error Details:", error.message);
      setOffers([]);
    } finally {
      setLoading(false);
    }
  };

  const updateOfferStatus = async (offerId: string, status: 'accepted' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('offers')
        .update({ status })
        .eq('id', offerId);

      if (error) throw error;

      toast.success(status === 'accepted' ? '✅ Ajánlat elfogadva!' : '❌ Ajánlat elutasítva');
      
      // Update local state
      setOffers(prev => prev.map(o => o.id === offerId ? { ...o, status } : o));

    } catch (error: any) {
      toast.error('Hiba történt: ' + error.message);
    }
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    accepted: 'bg-green-500/20 text-green-400 border-green-500/30',
    rejected: 'bg-red-500/20 text-red-400 border-red-500/30'
  };

  const statusLabels: Record<string, string> = {
    pending: 'Függőben',
    accepted: 'Elfogadva',
    rejected: 'Elutasítva'
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full"></div></div>;
  }

  if (offers.length === 0) {
    return (
      <div className="text-center py-12 text-white/50">
        <p>Még nincsenek beérkező ajánlataid</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {offers.map(offer => (
        <div key={offer.id} className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            
            <div className="w-16 h-16 rounded-xl bg-white/10 overflow-hidden flex-shrink-0">
              {offer.product.image_url ? (
                <img src={offer.product.image_url} alt={offer.product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">📷</div>
              )}
            </div>

            <div className="flex-1">
              <p className="font-semibold">{offer.product.name}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-accent font-bold">{offer.price.toLocaleString('hu-HU')} Ft</span>
                <span className="text-white/40 text-sm">eredeti: {offer.product.price.toLocaleString('hu-HU')} Ft</span>
              </div>
              {offer.message && <p className="text-white/60 text-sm mt-1">{offer.message}</p>}
            </div>

            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 text-sm rounded-full border ${statusColors[offer.status]}`}>
                <span className="flex items-center gap-1.5">
                  {offer.status === 'pending' && <Clock size={14} />}
                  {offer.status === 'accepted' && <Check size={14} />}
                  {offer.status === 'rejected' && <X size={14} />}
                  {statusLabels[offer.status]}
                </span>
              </span>

              {offer.status === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => updateOfferStatus(offer.id, 'accepted')}
                    className="p-2.5 rounded-xl bg-green-500/20 hover:bg-green-500/30 text-green-400 transition-colors"
                    title="Elfogadás"
                  >
                    <Check size={18} />
                  </button>
                  <button
                    onClick={() => updateOfferStatus(offer.id, 'rejected')}
                    className="p-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
                    title="Elutasítás"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      ))}
    </div>
  );
}