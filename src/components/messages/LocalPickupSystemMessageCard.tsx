'use client';

/**
 * RobeoBP — lokális átvétel rendszerüzenet kártya.
 *
 * Vizuálisan a SaleSystemMessageCard mintáját követi (emerald színek,
 * SystemMessageRoleBadge, termék snippet, alsó CTA), de:
 *   - nincs Foxpost címke nyomtatás (BP-ben nincs futár),
 *   - nincs txPaid figyelés (BP foglalás státusza local_pickup_pending),
 *   - a CTA a chat-fókuszálás (egyeztetés helyben).
 *
 * A SaleSystemMessageCard NEM módosul — ez a komponens külön mezőkkel egy
 * új eset (NO DELETION szabály).
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@/lib/utils';
import ClientFormattedTime from '@/components/ui/ClientFormattedTime';
import SystemMessageRoleBadge from '@/components/messages/SystemMessageRoleBadge';
import { useResolvedTransactionRole } from '@/hooks/useResolvedTransactionRole';
import { focusOrderPanel } from '@/lib/orderPanelActions';
import { toast } from 'sonner';

type Props = {
  productId: string | null;
  createdAt: string;
  viewerId: string;
  senderId: string;
  receiverId: string;
  sellerId?: string | null;
  timeLocale?: string;
};

type ProductSnippet = { id: string; name: string; price: number; user_id?: string };

const BUYER_BODY =
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
        .select('id, name, price, user_id')
        .eq('id', productId)
        .maybeSingle();
      if (cancelled || !data) return;
      setProduct({
        id: data.id,
        name: data.name,
        price: Number(data.price) || 0,
        user_id: data.user_id,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const sellerId = product?.user_id ?? sellerIdProp;
  const role = useResolvedTransactionRole(viewerId, sellerId);

  // Buyer és seller is ugyanazt a fő üzenetet kapja (a user által megadott
  // pontos szöveg). A role-aware részlet csak a CTA hangsúlyozásban tér el.
  const title = role === 'seller' ? 'Új foglalás érkezett' : 'Sikeres foglalás!';

  const handleOpenOrders = () => {
    if (!focusOrderPanel()) {
      toast.info('Nyisd meg a rendeléseidet a chat tetején.');
    }
  };

  // A senderId/receiverId-t azért fogadjuk, hogy az API contract egységes
  // legyen a SaleSystemMessageCard-dal; itt jelen szelvénynek nincs külön
  // logikai szerepük, de tipus-szigorúság miatt használjuk őket void-dal,
  // hogy a linter ne dobjon nem használt változó hibát.
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
      <p className="text-center text-xs text-gray-700 mt-2 leading-snug">{BUYER_BODY}</p>
      {product ? (
        <Link
          href={`/products/${product.id}`}
          className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-[#007782]/25 bg-white px-3 py-2 hover:bg-[#007782]/5"
        >
          <span className="font-semibold text-[#007782] truncate">{product.name}</span>
          <span className="shrink-0 font-bold tabular-nums">{formatPrice(product.price)}</span>
        </Link>
      ) : null}
      <button
        type="button"
        onClick={handleOpenOrders}
        className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-[#007782] px-4 min-h-11 py-2 text-sm font-semibold text-white touch-manipulation"
      >
        {role === 'seller' ? 'Foglalás megtekintése' : 'Egyeztetés a chatben'}
      </button>
      <p className="mt-2 text-[10px] text-center text-amber-800">
        Készpénz / direct P2P (RobeoBP — nincs online fizetés, nincs futár).
      </p>
      <div className="mt-2 text-center text-[10px] text-gray-400">
        <ClientFormattedTime iso={createdAt} locale={timeLocale} />
      </div>
    </div>
  );
}
