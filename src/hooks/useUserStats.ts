'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface UserStats {
  totalProducts: number;
  soldProducts: number;
  totalRevenue: number;
  averageRating: number;
  reviewCount: number;
}

export function useUserStats(userId: string | undefined) {
  const [stats, setStats] = useState<UserStats>({
    totalProducts: 0,
    soldProducts: 0,
    totalRevenue: 0,
    averageRating: 0,
    reviewCount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchStats = async () => {
      setLoading(true);

      try {
        // Összes termék számlálás
        const { count: productCount } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);

        // Eladott termékek és bevétel
        const { data: soldOffers } = await supabase
          .from('offers')
          .select('offered_price')
          .eq('seller_id', userId)
          .eq('status', 'completed');

        // Értékelések
        const { data: reviews } = await supabase
          .from('reviews')
          .select('rating')
          .eq('reviewed_id', userId);

        const totalRevenue = soldOffers?.reduce((sum, o) => sum + o.offered_price, 0) || 0;
        const avgRating = reviews && reviews.length > 0 
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
          : 0;

        setStats({
          totalProducts: productCount || 0,
          soldProducts: soldOffers?.length || 0,
          totalRevenue,
          averageRating: avgRating,
          reviewCount: reviews?.length || 0
        });

      } catch (error) {
        console.error('Error fetching user stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [userId]);

  return { stats, loading };
}