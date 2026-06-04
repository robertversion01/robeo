'use client';

/**
 * RobeoBP — lokális átvétel rendszerüzenet kártya (Clean Slate verzió).
 *
 * Minimalizalt UX: termek THUMBNAIL + cim + ar, role badge ("foglalas
 * erkezett" vagy "sikeres foglalas"), kozossegi pirula, es 1 mondat CTA
 * szoveg amit a felhasznalo a chatben olvas. Tovabbi CTA gomb /
 * focusOrderPanel hivas / amber "sub-disclaimer" NINCS — BP modban a chat
 * felulet teljesen tiszta beszelgetes-dobozkent szolgal, nincs e-commerce
 * stepper / order panel amit "meg lehetne nyitni".
 *
 * A SaleSystemMessageCard NEM modosul — ez kulonallo komponens (NO DELETION).
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@/lib/utils';
import { getOptimizedImageUrl } from '@/lib/imageUtils';
import ClientFormattedTime from '@/components/ui/ClientFormattedTime';
import SystemMessageRoleBadge from '@/components/messages/SystemMessageRoleBadge';
import { useResolvedTransactionRole } from '@/hooks/useResolvedTransactionRole';

type Props = {
  productId: string | null;
  createdAt: string;
  viewerId: string;
  senderId: string;
  receiverId: string;
  sellerId?: string | null;
  timeLocale?: string;
};

type ProductSnippet = {
  id: string;
  name: string;
  price: number;
  user_id?: string;
  thumbnail: string | null;
};

const BODY_TEXT =
  'Sikeres foglalás! Egyeztessétek a személyes találkozót, a helyszínt és a készpénzes vagy közvetlen fizetést itt a chatben.';

export default function LocalPickupSystemMessageCard({
  productId,
  createdAt,
  viewerId,
  senderId,
  receiverId,
  sellerId: sellerIdProp = null,
  timeLocale = 'hu-HU',
}: Props) {
  const [product, setProduct] = useState<ProductSnippet | null>(null);

  useEffect(() => {
    if (!productId) {
      setProduct(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from('products')
        .select('id, name, price, user_id, images, image_url')
        .eq('id', productId)
        .maybeSingle();
      if (cancelled || !data) return;
      const rawThumb =
        (Array.isArray((data as { images?: unknown }).images) &&
          ((data as { images?: string[] }).images?.[0] || null)) ||
        (data as { image_url?: string | null }).image_url ||
        null;
      setProduct({
        id: data.id,
        name: data.name,
        price: Number(data.price) || 0,
        user_id: data.user_id,
        thumbnail: rawThumb ? getOptimizedImageUrl(rawThumb, 80, 70) : null,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const sellerId = product?.user_id ?? sellerIdProp;
  const role = useResolvedTransactionRole(viewerId, sellerId);
  const title = role === 'seller' ? 'Új foglalás érkezett' : 'Sikeres foglalás!';

  // senderId/receiverId-t a API contract miatt fogadjuk (SaleSystemMessageCard
  // egysegesseg), de itt nem hasznaljuk — void-dal hallgatjuk el a lintert.
  void senderId;
  void receiverId;

  return (
    <div className="max-w-md rounded-xl border border-emerald-500/30 bg-emerald-50/80 px-4 py-3 text-sm text-gray-800">
      {role ? (
        <div className="flex justify-center mb-1">
          <SystemMessageRoleBadge role={role} />
        </div>
      ) : null}
      <p className="text-center font-semibold text-emerald-900">{title}</p>
      <div className="flex justify-center mt-1.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          Ingyenes budapesti cserebere — nulla jutalék!
        </span>
      </div>
      {product ? (
        <Link
          href={`/products/${product.id}`}
          className="mt-3 flex items-center gap-3 rounded-lg border border-[#007782]/25 bg-white px-2.5 py-2 hover:bg-[#007782]/5"
        >
          {product.thumbnail ? (
            <img
              src={product.thumbnail}
              alt={product.name}
              loading="lazy"
              decoding="async"
              className="h-12 w-12 shrink-0 rounded-md object-cover"
            />
          ) : (
            <div className="h-12 w-12 shrink-0 rounded-md bg-gray-100" aria-hidden />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[#007782]">{product.name}</p>
            <p className="text-xs font-bold tabular-nums text-gray-700">
              {formatPrice(product.price)}
            </p>
          </div>
        </Link>
      ) : null}
      <p className="text-center text-xs text-gray-700 mt-3 leading-snug">{BODY_TEXT}</p>
      <div className="mt-2 text-center text-[10px] text-gray-400">
        <ClientFormattedTime iso={createdAt} locale={timeLocale} />
      </div>
    </div>
  );
}
