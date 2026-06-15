import type { SupabaseClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/emailSend';
import { isEmailSendingConfigured } from '@/lib/emailConfig';
import { parseUserPreferences } from '@/lib/userPreferences';
import { parseDeliveryPrefs } from '@/lib/notificationDeliveryPrefs';
import { getDistrictLabel } from '@/lib/budapestDistricts';
import { isValidBudapestDistrict } from '@/lib/budapestDistricts';

const LOOKBACK_DAYS = 7;
const MAX_LISTINGS = 8;

export async function runDistrictDigestScan(supabase: SupabaseClient): Promise<{
  usersProcessed: number;
  emailsSent: number;
}> {
  if (!isEmailSendingConfigured()) {
    return { usersProcessed: 0, emailsSent: 0 };
  }

  let usersProcessed = 0;
  let emailsSent = 0;
  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: profiles } = await supabase.from('profiles').select('id').limit(500);
  if (!profiles) return { usersProcessed, emailsSent };

  for (const row of profiles) {
    const uid = String((row as { id: string }).id);
    const { data: authData, error: authError } = await supabase.auth.admin.getUserById(uid);
    if (authError || !authData?.user?.email) continue;

    const meta = authData.user.user_metadata as Record<string, unknown>;
    const delivery = parseDeliveryPrefs(meta);
    if (!delivery.emailEnabled) continue;

    const prefs = parseUserPreferences(meta);
    const district = prefs.feed.homeDistrict?.trim().toUpperCase();
    if (!district || !isValidBudapestDistrict(district)) continue;

    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, price, image_url, created_at')
      .eq('budapest_district', district)
      .gte('created_at', since)
      .or('status.eq.active,status.is.null')
      .order('created_at', { ascending: false })
      .limit(MAX_LISTINGS);

    if (productsError || !products?.length) continue;

    usersProcessed += 1;
    const label = getDistrictLabel(district);
    const lines = products.map(
      (p) =>
        `• ${String(p.name)} — ${Number(p.price).toLocaleString('hu-HU')} Ft\n  https://robeo.vercel.app/products/${p.id}`,
    );
    const subject = `Robeo — ${products.length} új hirdetés a ${label} kerületben`;
    const text = `Szia!\n\nAz elmúlt ${LOOKBACK_DAYS} napban ${products.length} új hirdetés jelent meg a ${label} kerületben:\n\n${lines.join('\n\n')}\n\nBöngéssz tovább: https://robeo.vercel.app/?dist=${district}`;
    const html = text.replace(/\n/g, '<br/>');

    const ok = await sendEmail({
      to: authData.user.email,
      subject,
      text,
      html,
    });
    if (ok) emailsSent += 1;
  }

  return { usersProcessed, emailsSent };
}
