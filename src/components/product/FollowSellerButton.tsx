'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { UserPlus, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { fetchSellerDisplayProfile, getSellerDisplayName } from '@/lib/sellerProfile';
import {
  insertAppNotificationSafe,
  isFollowingSeller,
  setFollowSeller,
} from '@/lib/supabaseResilience';

type Props = {
  sellerId: string;
  sellerLabel?: string;
  onFollowChange?: (following: boolean) => void;
};

export default function FollowSellerButton({
  sellerId,
  sellerLabel = 'eladót',
  onFollowChange,
}: Props) {
  const [userId, setUserId] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [followsAvailable, setFollowsAvailable] = useState(true);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);
    if (!user || user.id === sellerId) return;

    const isFollowing = await isFollowingSeller(supabase, user.id, sellerId);
    if (isFollowing === null) {
      setFollowsAvailable(false);
      return;
    }
    setFollowing(isFollowing);
    setFollowsAvailable(true);
  }, [sellerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async () => {
    if (!userId) {
      toast.error('Jelentkezz be a követéshez.');
      return;
    }
    if (userId === sellerId) return;

    setBusy(true);
    try {
      const result = await setFollowSeller(supabase, userId, sellerId, !following);
      if (!result.ok) {
        if (result.error?.includes('nincs telepítve')) {
          setFollowsAvailable(false);
        }
        throw new Error(result.error || 'Nem sikerült.');
      }

      const nextFollowing = !following;
      setFollowing(nextFollowing);
      onFollowChange?.(nextFollowing);

      if (nextFollowing) {
        const profile = await fetchSellerDisplayProfile(supabase, userId);
        const followerName = getSellerDisplayName(profile);

        await insertAppNotificationSafe(supabase, {
          user_id: sellerId,
          type: 'new_follower',
          title: 'Új követő',
          body: `${followerName} követni kezdett.`,
          link: `/profile/${userId}`,
        });

        toast.success(`Követed: ${sellerLabel} — értesítünk új termékeiről.`);
      } else {
        toast.success('Kikövetted az eladót.');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Nem sikerült.');
    } finally {
      setBusy(false);
    }
  };

  if (!userId || userId === sellerId) return null;

  if (!followsAvailable) {
    return (
      <p className="text-xs text-[#6b7d85]">Követés hamarosan (adatbázis patch szükséges).</p>
    );
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void toggle()}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold border transition-colors ${
        following
          ? 'border-[#007782] bg-[#007782]/10 text-[#007782]'
          : 'border-[#2a3941] bg-[#1a2328] text-[#e7edf0] hover:border-[#007782]'
      }`}
    >
      {following ? <UserCheck size={16} /> : <UserPlus size={16} />}
      {following ? 'Követed' : 'Követés'}
    </button>
  );
}
