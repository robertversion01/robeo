import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase';
import {
  parseNotificationOutbox,
  QUEUE_META_KEY,
  retryPendingOutboxesForUsers,
} from '@/lib/notificationOutbox';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 100;

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return runOutboxRetry();
}

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return runOutboxRetry();
}

async function runOutboxRetry() {
  const supabase = getSupabaseAdminClient();
  if (!supabase?.auth.admin?.listUsers) {
    return NextResponse.json({ error: 'Service role required' }, { status: 500 });
  }

  const pendingUserIds: string[] = [];
  let page = 1;

  while (pendingUserIds.length < 200) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: PAGE_SIZE,
    });
    if (error) break;
    const users = data?.users || [];
    if (users.length === 0) break;

    for (const u of users) {
      const meta = (u.user_metadata || {}) as Record<string, unknown>;
      const outbox = parseNotificationOutbox(meta);
      if (outbox.length > 0) pendingUserIds.push(u.id);
    }

    if (users.length < PAGE_SIZE) break;
    page += 1;
  }

  const result = await retryPendingOutboxesForUsers(supabase, pendingUserIds);

  return NextResponse.json({
    ok: true,
    scannedUsers: pendingUserIds.length,
    ...result,
    metaKey: QUEUE_META_KEY,
  });
}
