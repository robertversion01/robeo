'use client';

import { useClientMounted } from '@/hooks/useClientMounted';
import type { ChatMessageRole } from '@/lib/systemMessageView';

/** Szerepfüggő szöveg csak mount + sellerId után — hydration-safe. */
export function useResolvedTransactionRole(
  viewerId: string,
  sellerId: string | null | undefined,
): ChatMessageRole | null {
  const mounted = useClientMounted();
  if (!mounted || !sellerId) return null;
  return viewerId === sellerId ? 'seller' : 'buyer';
}
