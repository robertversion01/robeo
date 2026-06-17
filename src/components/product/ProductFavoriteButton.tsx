'use client';

import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

import { upsertPriceWatch, removePriceWatch, listPriceWatches } from '@/lib/priceWatch';
import { syncPriceWatchesToServer } from '@/lib/priceWatchSync';

type Props = {
  productId: string;
  productName?: string;
  productPrice?: number;
  className?: string;
};

export default function ProductFavoriteButton({
  productId,
  productName,
  productPrice,
  className,
}: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .maybeSingle();
      if (!cancelled) {
        setIsFavorite(!!data);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const toggle = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth');
      return;
    }

    if (pending) return;
    setPending(true);
    const next = !isFavorite;
    setIsFavorite(next);

    try {
      if (next) {
        const { error } = await supabase.from('favorites').insert({ user_id: user.id, product_id: productId });
        if (error) throw error;
        if (productName != null && productPrice != null) {
          upsertPriceWatch({
            productId,
            productName,
            lastPrice: productPrice,
            alertEnabled: true,
          });
          void syncPriceWatchesToServer(listPriceWatches());
        }
      } else {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', productId);
        if (error) throw error;
        removePriceWatch(productId);
        void syncPriceWatchesToServer(listPriceWatches());
      }
    } catch {
      setIsFavorite(!next);
      toast.error(t('favorites.updateFailed'));
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={loading || pending}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? t('product.favoriteRemove') : t('product.favoriteAdd')}
      className={cn(
        'inline-flex h-10 w-10 items-center justify-center rounded-full border bg-[#11171a]/95 shadow-sm backdrop-blur-sm transition-colors',
        isFavorite
          ? 'border-red-900/45 text-red-500 hover:bg-red-950/40'
          : 'border-[#2a3941] text-[#8fa3ad] hover:border-[#007782]/30 hover:text-[#007782]',
        className,
      )}
    >
      <Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} />
    </button>
  );
}
