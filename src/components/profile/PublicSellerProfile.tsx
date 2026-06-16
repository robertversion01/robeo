'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { fetchFollowCounts } from '@/lib/followCounts';
import { fetchSellerDisplayProfile, getSellerDisplayName } from '@/lib/sellerProfile';
import FollowSellerButton from '@/components/product/FollowSellerButton';
import BlockUserButton from '@/components/trust/BlockUserButton';
import ReportUserButton from '@/components/trust/ReportUserButton';
import SellerTrustPanel from '@/components/profile/SellerTrustPanel';
import SellerTrustBadges from '@/components/profile/SellerTrustBadges';
import TrustSafetyBlock from '@/components/trust/TrustSafetyBlock';
import ProductGrid from '@/components/product/ProductGrid';
import ReceivedReviewCard, { type ReceivedReview } from '@/components/review/ReceivedReviewCard';
import type { Product } from '@/types';
import { isActiveListing } from '@/lib/listedProducts';
import { enrichProductsWithFavoriteCounts } from '@/lib/favoriteCounts';
import { MAIN_TOP_PADDING } from '@/lib/layoutTokens';
import { useTranslation } from 'react-i18next';

type Props = {
  sellerId: string;
};

export default function PublicSellerProfile({ sellerId }: Props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [reviews, setReviews] = useState<ReceivedReview[]>([]);
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
        supabase
          .from('reviews')
          .select('id, rating, comment, created_at, seller_response, seller_response_at')
          .eq('reviewed_id', sellerId)
          .order('created_at', { ascending: false }),
      ]);

      setDisplayName(getSellerDisplayName(profile));
      setBio(profile?.bio?.trim() || '');
      setFollowers(counts.followers);
      setFollowing(counts.following);
      const rows = ((productsRes.data || []) as Product[]).filter((p) => isActiveListing(p.status));
      const enriched = await enrichProductsWithFavoriteCounts(supabase, rows);
      setProducts(enriched);

      // Graceful fallback, ha a seller_response oszlop meg nincs migralva.
      let reviewRows = (reviewsRes.data || []) as ReceivedReview[];
      if (reviewsRes.error) {
        const fb = await supabase
          .from('reviews')
          .select('id, rating, comment, created_at')
          .eq('reviewed_id', sellerId)
          .order('created_at', { ascending: false });
        reviewRows = (fb.data || []) as ReceivedReview[];
      }
      const ratings = reviewRows.map((r) => Number(r.rating)).filter((n) => n > 0);
      setReviewCount(ratings.length);
      setAvgRating(ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null);
      setReviews(reviewRows.filter((r) => r.comment || r.seller_response).slice(0, 5));

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
    <main className={`min-h-screen bg-white ${MAIN_TOP_PADDING} px-4`}>
      <div className="max-w-4xl mx-auto">
        <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-[#007782]/5 to-white p-5 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{displayName || t('publicSeller.defaultName')}</h1>
          {bio ? (
            <p className="mt-2 text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{bio}</p>
          ) : null}

          <SellerTrustBadges
            avgRating={avgRating}
            reviewCount={reviewCount}
            followers={followers}
            listingsCount={products.length}
            className="mt-3"
          />

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

          <SellerTrustPanel sellerId={sellerId} className="mb-3" />
          <TrustSafetyBlock variant="compact" className="mb-3" />

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
            {viewerId && viewerId !== sellerId ? (
              <span className="ml-auto flex items-center gap-3">
                <ReportUserButton reportedId={sellerId} context="profile" />
                <BlockUserButton otherUserId={sellerId} />
              </span>
            ) : null}
            {viewerId === sellerId ? (
              <Link href="/profile" className="text-sm font-semibold text-[#007782] hover:underline">
                {t('publicSeller.ownProfileLink')}
              </Link>
            ) : null}
          </div>
        </div>

        {reviews.length > 0 ? (
          <section className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3">
              {t('publicSeller.reviewsTitle')}
            </h2>
            <div className="space-y-3">
              {reviews.map((review) => (
                <ReceivedReviewCard key={review.id} review={review} />
              ))}
            </div>
          </section>
        ) : null}

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
