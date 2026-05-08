'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type FreshOffer = {
  id: string;
  offered_price: number;
  status: string;
  created_at: string;
  product: {
    id: string;
    name: string;
    image_url: string | null;
    price: number;
  } | null;
};

export default function FreshOffersStrip() {
  const [offers, setOffers] = useState<FreshOffer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFreshOffers = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('offers')
        .select('id, offered_price, status, created_at, product:products(id, name, image_url, price)')
        .eq('seller_id', user.id)
        .in('status', ['pending', 'countered'])
        .order('created_at', { ascending: false })
        .limit(12);

      if (!error) {
        const mapped = (data || []).map((item: any) => ({
          ...item,
          product: Array.isArray(item.product) ? item.product[0] : item.product,
        }));
        setOffers(mapped as FreshOffer[]);
      }
      setLoading(false);
    };

    loadFreshOffers();
  }, []);

  if (loading || offers.length === 0) return null;

  return (
    <section className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm md:text-base font-semibold text-gray-900">Friss ajánlatok neked</h2>
        <Link href="/messages" className="text-xs text-[#007782] hover:underline">
          Összes megnyitása
        </Link>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {offers.map((offer) => (
          <Link
            key={offer.id}
            href="/messages"
            className="min-w-[220px] max-w-[220px] bg-white border border-gray-200 rounded-xl p-2.5 hover:border-[#007782]/40 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="h-14 w-14 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                {offer.product?.image_url ? (
                  <img src={offer.product.image_url} alt={offer.product?.name || 'Termék'} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-gray-400">📦</div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 truncate">{offer.product?.name || 'Termék'}</p>
                <p className="text-sm font-semibold text-[#007782]">{offer.offered_price.toLocaleString('hu-HU')} Ft</p>
                <p className="text-[11px] text-gray-500">
                  Eredeti: {offer.product?.price?.toLocaleString('hu-HU') || '0'} Ft
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
