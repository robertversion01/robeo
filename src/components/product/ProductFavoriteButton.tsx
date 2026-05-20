'use client';

import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

type Props = {
  productId: string;
  className?: string;
};

export default function ProductFavoriteButton({ productId, className }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);

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

    const next = !isFavorite;
    setIsFavorite(next);

    try {
      if (next) {
        await supabase.from('favorites').insert({ user_id: user.id, product_id: productId });
      } else {
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', productId);
      }
    } catch {
      setIsFavorite(!next);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={loading}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? t('product.favoriteRemove') : t('product.favoriteAdd')}
      className={cn(
        'inline-flex h-10 w-10 items-center justify-center rounded-full border bg-white/95 shadow-sm backdrop-blur-sm transition-colors',
        isFavorite
          ? 'border-red-200 text-red-500 hover:bg-red-50'
          : 'border-gray-200 text-gray-600 hover:border-[#007782]/30 hover:text-[#007782]',
        className,
      )}
    >
      <Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} />
    </button>
  );
}
