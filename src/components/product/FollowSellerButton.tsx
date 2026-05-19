'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { UserPlus, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

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

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);
    if (!user || user.id === sellerId) return;

    const { data } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', user.id)
      .eq('following_id', sellerId)
      .maybeSingle();

    setFollowing(Boolean(data));
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
      if (following) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', userId)
          .eq('following_id', sellerId);
        if (error) throw error;
        setFollowing(false);
        onFollowChange?.(false);
        toast.success('Kikövetted az eladót.');
      } else {
        const { error } = await supabase.from('follows').insert({
          follower_id: userId,
          following_id: sellerId,
        });
        if (error) throw error;
        setFollowing(true);
        onFollowChange?.(true);

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, name, email')
          .eq('id', userId)
          .maybeSingle();
        const followerName =
          profile?.full_name?.trim() ||
          profile?.name?.trim() ||
          profile?.email?.split('@')[0] ||
          'Valaki';

        await supabase.from('app_notifications').insert({
          user_id: sellerId,
          type: 'new_follower',
          title: 'Új követő',
          body: `${followerName} követni kezdett.`,
          link: `/profile/${userId}`,
        });

        toast.success(`Követed: ${sellerLabel} — értesítünk új termékeiről.`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Nem sikerült.');
    } finally {
      setBusy(false);
    }
  };

  if (!userId || userId === sellerId) return null;

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void toggle()}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold border transition-colors ${
        following
          ? 'border-[#007782] bg-[#007782]/10 text-[#007782]'
          : 'border-gray-300 bg-white text-gray-800 hover:border-[#007782]'
      }`}
    >
      {following ? <UserCheck size={16} /> : <UserPlus size={16} />}
      {following ? 'Követed' : 'Követés'}
    </button>
  );
}
