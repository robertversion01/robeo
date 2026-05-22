import type { SupabaseClient } from '@supabase/supabase-js';
import { flushOutboxAfterRoute } from '@/lib/notificationOutbox';
import { routeMarketplaceNotification } from '@/lib/notificationChannels';
import {
  loadServerNotificationDedupe,
  markServerNotificationDedupe,
  wasRecentlyNotified,
} from '@/lib/notificationDedupe';
import { fetchSellerDisplayProfile, getSellerDisplayName } from '@/lib/sellerProfile';

/** Követők értesítése új termékről — in-app + push/email outbox. */
export async function notifyFollowersOfNewProduct(
  supabase: SupabaseClient,
  input: {
    productId: string;
    sellerId: string;
    productName: string;
  },
): Promise<{ notified: number; outboundQueued: number }> {
  const { data: followers, error } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('following_id', input.sellerId);

  if (error || !followers?.length) {
    return { notified: 0, outboundQueued: 0 };
  }

  const profile = await fetchSellerDisplayProfile(supabase, input.sellerId);
  const sellerLabel = getSellerDisplayName(profile);
  const link = `/products/${input.productId}`;

  let notified = 0;
  let outboundQueued = 0;

  for (const row of followers) {
    const followerId = String((row as { follower_id: string }).follower_id);
    const dedupeKey = `${input.productId}:${followerId}`;
    const dedupe = await loadServerNotificationDedupe(supabase, followerId, 'seller_new_item');
    if (wasRecentlyNotified(dedupe, dedupeKey)) continue;

    const { data: authData } = await supabase.auth.admin.getUserById(followerId);
    const email = authData?.user?.email ?? null;

    const routed = await routeMarketplaceNotification(
      supabase,
      {
        userId: followerId,
        type: 'seller_new_item',
        title: `${sellerLabel} feltöltött egy új terméket`,
        body: input.productName,
        link,
      },
      { userEmail: email },
    );

    if (routed.inApp || routed.push || routed.email) {
      notified += 1;
      await markServerNotificationDedupe(supabase, followerId, 'seller_new_item', [dedupeKey]);
    }
    if (routed.push || routed.email) {
      outboundQueued += 1;
      await flushOutboxAfterRoute(supabase, followerId, email);
    }
  }

  return { notified, outboundQueued };
}
