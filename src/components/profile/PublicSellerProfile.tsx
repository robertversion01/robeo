'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { fetchFollowCounts } from '@/lib/followCounts';
import { fetchSellerDisplayProfile, getSellerDisplayName } from '@/lib/sellerProfile';
import FollowSellerButton from '@/components/product/FollowSellerButton';
import SellerTrustBadges from '@/components/profile/SellerTrustBadges';
import ProductGrid from '@/components/product/ProductGrid';
import StarRating from '@/components/review/StarRating';
import type { Product } from '@/types';
import { MAIN_TOP_PADDING, MOBILE_PAGE_BOTTOM_CLASS } from '@/lib/layoutTokens';
import { useTranslation } from 'react-i18next';

type Props = {
  sellerId: string;
};

export default function PublicSellerProfile({ sellerId }: Props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [displayName, setDisplayName] = useState('');
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    void load();
  }, [sellerId]);

  const load = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setViewerId(user?.id ?? null);

      const [profile, counts, productsRes, reviewsRes] = await Promise.all([
        fetchSellerDisplayProfile(supabase, sellerId),
        fetchFollowCounts(supabase, sellerId),
        supabase
          .from('products')
          .select('*')
          .eq('user_id', sellerId)
          .or('status.eq.active,status.is.null')
          .order('created_at', { ascending: false }),
        supabase.from('reviews').select('rating').eq('reviewed_id', sellerId),
      ]);

      setDisplayName(getSellerDisplayName(profile));
      setFollowers(counts.followers);
      setFollowing(counts.following);
      setProducts(((productsRes.data || []) as Product[]).filter((p) => p.status !== 'sold' && p.status !== 'deleted'));

      const ratings = (reviewsRes.data || []).map((r) => Number(r.rating)).filter((n) => n > 0);
      setAvgRating(ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null);

      if (user) {
        const { data: favs } = await supabase
          .from('favorites')
          .select('product_id')
          .eq('user_id', user.id);
        if (favs) setFavorites(new Set(favs.map((f) => f.product_id)));
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (productId: string) => {
    if (!viewerId) return;
    const isFav = favorites.has(productId);
    setFavorites((prev) => {
      const next = new Set(prev);
      isFav ? next.delete(productId) : next.add(productId);
      return next;
    });
    if (isFav) {
      await supabase.from('favorites').delete().eq('user_id', viewerId).eq('product_id', productId);
    } else {
      await supabase.from('favorites').insert({ user_id: viewerId, product_id: productId });
    }
  };

  const refreshCounts = () => {
    void fetchFollowCounts(supabase, sellerId).then((c) => {
      setFollowers(c.followers);
      setFollowing(c.following);
    });
  };

  return (
    <main className={`min-h-screen bg-white ${MAIN_TOP_PADDING} ${MOBILE_PAGE_BOTTOM_CLASS} px-4`}>
      <div className="max-w-4xl mx-auto">
        <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-[#007782]/5 to-white p-5 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{displayName || t('publicSeller.defaultName')}</h1>
          {avgRating != null ? (
            <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
              <StarRating rating={avgRating} size={16} />
              <span>{avgRating.toFixed(1)} / 5</span>
            </div>
          ) : null}

          <div className="flex gap-6 mt-4 text-sm">
            <div>
              <p className="font-bold text-gray-900">{followers}</p>
              <p className="text-gray-500">{t('publicSeller.followers')}</p>
            </div>
            <div>
              <p className="font-bold text-gray-900">{following}</p>
              <p className="text-gray-500">{t('publicSeller.following')}</p>
            </div>
            <div>
              <p className="font-bold text-gray-900">{products.length}</p>
              <p className="text-gray-500">{t('publicSeller.products')}</p>
            </div>
          </div>

          <SellerTrustBadges
            avgRating={avgRating}
            reviewCount={reviewCount}
            followers={followers}
            listingsCount={products.length}
          />

          <div className="mt-4 flex flex-wrap gap-2">
            <FollowSellerButton
              sellerId={sellerId}
              sellerLabel={displayName}
              onFollowChange={() => refreshCounts()}
            />
            <button
              type="button"
              onClick={refreshCounts}
              className="text-xs text-gray-500 underline"
            >
              {t('publicSeller.refresh')}
            </button>
            {viewerId === sellerId ? (
              <Link href="/profile" className="text-sm font-semibold text-[#007782] hover:underline">
                {t('publicSeller.ownProfileLink')}
              </Link>
            ) : null}
          </div>
        </div>

        <h2 className="text-lg font-bold text-gray-900 mb-3">{t('publicSeller.listingsTitle')}</h2>
        <ProductGrid
          products={products}
          loading={loading}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
        />
      </div>
    </main>
  );
}
