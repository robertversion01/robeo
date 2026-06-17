'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { enrichProductsWithFavoriteCounts } from '@/lib/favoriteCounts';
import { filterProductsWithValidImages } from '@/lib/productImageValidation';
import { isActiveListing } from '@/lib/listedProducts';
import ProductCard from '@/components/product/ProductCard';
import { enrichProductsWithSellerInfo } from '@/lib/sellerCardEnrichment';
import type { ProductWithSeller } from '@/lib/sellerCardEnrichment';
import type { Product } from '@/types';

type Props = {
  className?: string;
};

export default function FollowedSellersStrip({ className = 'mb-4' }: Props) {
  const { t } = useTranslation();
  const [products, setProducts] = useState<ProductWithSeller[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [favoritePending, setFavoritePending] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        setLoading(false);
        return;
      }
      setViewerId(user.id);

      const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)
        .limit(50);

      const sellerIds = (follows || []).map((f) => String(f.following_id)).filter(Boolean);
      if (sellerIds.length === 0) {
        setLoading(false);
        return;
      }

      const { data: rows } = await supabase
        .from('products')
        .select('*')
        .in('user_id', sellerIds)
        .or('status.eq.active,status.is.null')
        .order('created_at', { ascending: false })
        .limit(24);

      let list = ((rows || []) as Product[]).filter((p) => isActiveListing(p.status));
      list = filterProductsWithValidImages(list);
      list = await enrichProductsWithFavoriteCounts(supabase, list);
      list = await enrichProductsWithSellerInfo(supabase, list);
      if (cancelled) return;
      setProducts(list.slice(0, 12));

      const { data: favs } = await supabase
        .from('favorites')
        .select('product_id')
        .eq('user_id', user.id);
      if (!cancelled && favs) {
        setFavorites(new Set(favs.map((f) => f.product_id)));
      }
      setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleFavorite = async (productId: string) => {
    if (!viewerId) return;
    if (favoritePending.has(productId)) return;
    setFavoritePending((prev) => new Set(prev).add(productId));
    const isFav = favorites.has(productId);
    setFavorites((prev) => {
      const next = new Set(prev);
      isFav ? next.delete(productId) : next.add(productId);
      return next;
    });
    try {
      if (isFav) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', viewerId)
          .eq('product_id', productId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('favorites').insert({ user_id: viewerId, product_id: productId });
        if (error) throw error;
      }
    } catch {
      setFavorites((prev) => {
        const next = new Set(prev);
        isFav ? next.add(productId) : next.delete(productId);
        return next;
      });
      toast.error(t('favorites.updateFailed'));
    } finally {
      setFavoritePending((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  };

  if (loading || products.length === 0) return null;

  return (
    <section className={className}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-[#e7edf0]">{t('feed.followed.title')}</h2>
          <p className="text-[11px] text-[#8fa3ad]">{t('feed.followed.hint')}</p>
        </div>
        <Link href="/browse" className="text-xs font-medium text-[#007782] hover:underline shrink-0">
          {t('feed.followed.more')}
        </Link>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory">
        {products.map((product) => (
          <div key={product.id} className="w-[140px] shrink-0 snap-start sm:w-[160px]">
            <ProductCard
              product={product}
              isFavorite={favorites.has(product.id)}
              onToggleFavorite={() => void toggleFavorite(product.id)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
