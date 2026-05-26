'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface UserStats {
  totalProducts: number;
  soldProducts: number;
  totalRevenue: number;
  walletAvailable: number;
  walletPending: number;
  averageRating: number;
  reviewCount: number;
}

const COMPLETED_TX_STATUSES = [
  'sikeresen_atveve',
  'completed',
  'funds_released',
  'fizetve',
  'feladva',
  'uton',
  'atvetelre_var',
];

function netFromTx(row: {
  amount?: number | null;
  fee?: number | null;
  shipping_cost?: number | null;
}): number {
  const amount = Math.round(Number(row.amount) || 0);
  const fee = Math.round(Number(row.fee) || 0);
  const ship = Math.round(Number(row.shipping_cost) || 0);
  return Math.max(0, amount - fee - ship);
}

export function useUserStats(userId: string | undefined, refreshToken: number = 0) {
  const [stats, setStats] = useState<UserStats>({
    totalProducts: 0,
    soldProducts: 0,
    totalRevenue: 0,
    walletAvailable: 0,
    walletPending: 0,
    averageRating: 0,
    reviewCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchStats = async () => {
      setLoading(true);

      try {
        const { count: productCount } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);

        const { data: completedTxs } = await supabase
          .from('transactions')
          .select('amount, fee, shipping_cost, status')
          .eq('seller_id', userId)
          .in('status', COMPLETED_TX_STATUSES);

        const { data: reviews } = await supabase
          .from('reviews')
          .select('rating')
          .eq('reviewed_id', userId);

        const { data: wallet } = await supabase
          .from('wallets')
          .select('available_balance, pending_balance')
          .eq('user_id', userId)
          .maybeSingle();

        const totalRevenue =
          completedTxs?.reduce((sum, tx) => sum + netFromTx(tx), 0) || 0;
        const soldCount = completedTxs?.length || 0;
        const avgRating =
          reviews && reviews.length > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
            : 0;

        setStats({
          totalProducts: productCount || 0,
          soldProducts: soldCount,
          totalRevenue,
          walletAvailable: Number(wallet?.available_balance) || 0,
          walletPending: Number(wallet?.pending_balance) || 0,
          averageRating: avgRating,
          reviewCount: reviews?.length || 0,
        });
      } catch (error) {
        console.error('Error fetching user stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [userId, refreshToken]);

  return { stats, loading };
}