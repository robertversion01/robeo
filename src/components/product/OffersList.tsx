'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Check, X, Clock, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface Offer {
  id: string;
  offered_price: number;
  message: string | null;
  status: string;
  created_at: string;
  buyer_id: string;
  seller_id?: string;
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
  const [counterValues, setCounterValues] = useState<Record<string, string>>({});

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
          offered_price,
          message,
          status,
          created_at,
          buyer_id,
          product:products(id, name, price, image_url)
        `)
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      // Supabase joins return arrays, map to the expected format
      const mapped = (data || []).map((item: any) => ({
        ...item,
        product: Array.isArray(item.product) ? item.product[0] : item.product,
      }));
      setOffers(mapped as Offer[]);
    } catch (error: any) {
      console.error("Supabase Error Details:", error.message);
      setOffers([]);
    } finally {
      setLoading(false);
    }
  };

  const updateOfferStatus = async (offerId: string, status: 'accepted' | 'rejected') => {
    try {
      // Find the offer in state to get buyer/product info
      const currentOffer = offers.find(o => o.id === offerId);
      if (!currentOffer) return;

      const { error } = await supabase
        .from('offers')
        .update({ status })
        .eq('id', offerId);

      if (error) throw error;

      // Send system message about the decision
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      if (status === 'accepted') {
        // Send message to buyer with payment link
        await supabase
          .from('messages')
          .insert({
            sender_id: user.id,
            receiver_id: currentOffer.buyer_id,
            content: `✅ Ajánlatod elfogadva! Fizess itt: ${window.location.origin}/checkout?offer=${offerId}`,
            product_id: currentOffer.product.id,
            is_system_message: true
          });
      } else {
        await supabase
          .from('messages')
          .insert({
            sender_id: user.id,
            receiver_id: currentOffer.buyer_id,
            content: `❌ Ajánlatod elutasítva: ${currentOffer.product.name}`,
            product_id: currentOffer.product.id,
            is_system_message: true
          });
      }

      toast.success(status === 'accepted' ? '✅ Ajánlat elfogadva! A vevő értesítést kapott.' : '❌ Ajánlat elutasítva');
      
      // Update local state
      setOffers(prev => prev.map(o => o.id === offerId ? { ...o, status } : o));

    } catch (error: any) {
      toast.error('Hiba történt: ' + error.message);
    }
  };

  const sendCounterOffer = async (offer: Offer) => {
    const rawValue = counterValues[offer.id];
    const counterPrice = Number(rawValue);
    if (!counterPrice || counterPrice <= 0) {
      toast.error('Adj meg egy ervenyes ellenajanlatot.');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('offers')
        .update({ status: 'countered', offered_price: counterPrice })
        .eq('id', offer.id);

      if (error) throw error;

      await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: offer.buyer_id,
          content: `🔁 Ellenajanlat: ${counterPrice.toLocaleString('hu-HU')} Ft a(z) ${offer.product.name} termekre.`,
          product_id: offer.product.id,
          is_system_message: true
        });

      toast.success('Ellenajanlat elkuldve');
      setOffers((prev) =>
        prev.map((o) => (o.id === offer.id ? { ...o, status: 'countered', offered_price: counterPrice } : o))
      );
    } catch (error: any) {
      toast.error(`Hiba: ${error.message}`);
    }
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    accepted: 'bg-green-500/20 text-green-400 border-green-500/30',
    rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
    countered: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
  };

  const statusLabels: Record<string, string> = {
    pending: 'Függőben',
    accepted: 'Elfogadva',
    rejected: 'Elutasítva',
    countered: 'Ellenajánlat'
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full"></div></div>;
  }

  if (offers.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>Még nincsenek beérkező ajánlataid</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {offers.map(offer => (
        <div key={offer.id} className="p-5 rounded-2xl bg-white border border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            
            <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
              {offer.product.image_url ? (
                <img src={offer.product.image_url} alt={offer.product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">📷</div>
              )}
            </div>

            <div className="flex-1">
              <p className="font-semibold">{offer.product.name}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[#007782] font-bold">{offer.offered_price.toLocaleString('hu-HU')} Ft</span>
                <span className="text-gray-500 text-sm">eredeti: {offer.product.price.toLocaleString('hu-HU')} Ft</span>
              </div>
              {offer.message && <p className="text-gray-600 text-sm mt-1">{offer.message}</p>}
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
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      value={counterValues[offer.id] || ''}
                      onChange={(e) =>
                        setCounterValues((prev) => ({ ...prev, [offer.id]: e.target.value }))
                      }
                      placeholder="Ellenajanlat"
                      className="w-32 rounded-xl bg-gray-50 border border-gray-300 px-2 py-1 text-sm"
                    />
                    <button
                      onClick={() => sendCounterOffer(offer)}
                      className="px-3 py-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 text-xs transition-colors"
                      title="Ellenajánlat"
                    >
                      Ellenajanlat
                    </button>
                  </div>
                  <div className="flex gap-2">
                  <button
                    onClick={() => updateOfferStatus(offer.id, 'accepted')}
                    className="px-3 py-1.5 rounded-full bg-[#007782] hover:bg-[#00616b] text-white text-sm transition-colors"
                    title="Elfogadás"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={() => updateOfferStatus(offer.id, 'rejected')}
                    className="px-3 py-1.5 rounded-full bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 text-sm transition-colors"
                    title="Elutasítás"
                  >
                    <X size={16} />
                  </button>
                  </div>
                </div>
              )}

              {offer.status === 'accepted' && (
                <Link
                  href={`/checkout?offer=${offer.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#007782] text-white text-sm hover:bg-[#00616b] transition-colors"
                >
                  <ExternalLink size={14} />
                  Fizetés
                </Link>
              )}
            </div>

          </div>
        </div>
      ))}
    </div>
  );
}