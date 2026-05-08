'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type FreshItem = {
  id: string;
  name: string;
  image_url: string | null;
  price: number;
  category: string;
};

interface FreshOffersStripProps {
  title?: string;
  className?: string;
}

export default function FreshOffersStrip({
  title = 'Friss ajánlatok neked',
  className = 'mb-5',
}: FreshOffersStripProps) {
  const [items, setItems] = useState<FreshItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFreshOffers = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, image_url, price, category')
        .not('status', 'eq', 'deleted')
        .order('created_at', { ascending: false })
        .limit(12);

      if (!error) {
        setItems((data || []) as FreshItem[]);
      }
      setLoading(false);
    };

    loadFreshOffers();
  }, []);

  if (loading) return null;

  return (
    <section className={className}>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm md:text-base font-semibold text-black">{title}</h2>
        <Link href="/" className="text-xs text-[#007782] hover:underline">
          Továbbiak
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="card-base px-4 py-3 text-sm text-gray-500">
          Jelenleg nincs elérhető friss ajánlat.
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/products/${item.id}`}
            className="min-w-[220px] max-w-[220px] card-base p-2.5 hover:border-[#007782]/40 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="h-14 w-14 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name || 'Termék'} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-gray-400">📦</div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 truncate">{item.name || 'Termék'}</p>
                <p className="text-sm font-semibold text-[#007782]">{item.price.toLocaleString('hu-HU')} Ft</p>
                <p className="text-[11px] text-gray-500">{item.category || 'Egyéb'}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
      )}
    </section>
  );
}
