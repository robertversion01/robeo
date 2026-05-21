import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase';
import { flushNotificationOutbox, parseNotificationOutbox } from '@/lib/notificationOutbox';
import { parseDeliveryPrefs } from '@/lib/notificationDeliveryPrefs';
import { isEmailSendingConfigured } from '@/lib/emailConfig';

export const dynamic = 'force-dynamic';

/** Vercel Cron — napi e-mail digest (emailDigest=true outbox) */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return runDigest();
}

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return runDigest();
  }
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

async function runDigest() {
  if (!isEmailSendingConfigured()) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'email_not_configured' });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Admin Supabase unavailable' }, { status: 500 });
  }

  let usersProcessed = 0;
  let emailsSent = 0;

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id')
    .limit(300);

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
  }

  for (const row of profiles || []) {
    const uid = String((row as { id: string }).id);
    const { data: authData, error: authError } = await supabase.auth.admin.getUserById(uid);
    if (authError || !authData?.user) continue;

    const meta = authData.user.user_metadata as Record<string, unknown>;
    const delivery = parseDeliveryPrefs(meta);
    if (!delivery.emailEnabled || !delivery.emailDigest) continue;

    const outbox = parseNotificationOutbox(meta);
    const hasEmail = outbox.some((i) => i.channel === 'email');
    if (!hasEmail) continue;

    usersProcessed += 1;
    const result = await flushNotificationOutbox(supabase, uid, {
      digestOnly: true,
      userEmail: authData.user.email,
    });
    emailsSent += result.emailSent;
  }

  return NextResponse.json({
    ok: true,
    usersProcessed,
    emailsSent,
    mode: 'digest',
  });
}
