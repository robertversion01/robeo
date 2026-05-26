'use client';

import { useCallback, useEffect, useState } from 'react';
import { Ban } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { checkBlockBetween } from '@/lib/userBlocks';

type Props = {
  otherUserId: string;
  className?: string;
  onBlocked?: () => void;
};

export default function BlockUserButton({ otherUserId, className = '', onBlocked }: Props) {
  const { t } = useTranslation();
  const [blockedByMe, setBlockedByMe] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id || !otherUserId) return;
    const check = await checkBlockBetween(supabase, user.id, otherUserId);
    setBlockedByMe(check.blockedByMe);
  }, [otherUserId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toggle = async () => {
    setBusy(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        toast.error(t('auth.errors.generic'));
        return;
      }

      if (blockedByMe) {
        const res = await fetch(`/api/users/block?userId=${encodeURIComponent(otherUserId)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(await res.text());
        setBlockedByMe(false);
        toast.success(t('block.unblocked'));
        onBlocked?.();
      } else {
        if (!window.confirm(t('block.confirm'))) return;
        const res = await fetch('/api/users/block', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ blockedUserId: otherUserId }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          if (data.error === 'schema_missing') {
            toast.error(t('block.schemaMissing'));
            return;
          }
          throw new Error(data.error || 'block failed');
        }
        setBlockedByMe(true);
        toast.success(t('block.blocked'));
        onBlocked?.();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('block.failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void toggle()}
      className={`inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-red-600 disabled:opacity-50 ${className}`}
      title={blockedByMe ? t('block.unblockAction') : t('block.blockAction')}
    >
      <Ban size={14} />
      {blockedByMe ? t('block.unblockAction') : t('block.blockAction')}
    </button>
  );
}
