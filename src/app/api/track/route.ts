import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

type IncomingEvent = {
  name?: unknown;
  props?: unknown;
  path?: unknown;
  session_id?: unknown;
};

const MAX_EVENTS = 20;
const MAX_NAME_LEN = 80;
const MAX_PATH_LEN = 300;

type AnalyticsRow = {
  session_id: string;
  name: string;
  props: Record<string, unknown>;
  path: string | null;
};

function sanitizeProps(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: Record<string, unknown> = {};
  let count = 0;
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (count >= 20) break;
    if (typeof v === 'string') out[k] = v.slice(0, 200);
    else if (typeof v === 'number' || typeof v === 'boolean') out[k] = v;
    count += 1;
  }
  return out;
}

export async function POST(req: NextRequest) {
  // Soha ne dobjon: analytics nem blokkolhatja a usert.
  try {
    const body = (await req.json()) as { events?: IncomingEvent[]; session_id?: unknown };
    const events = Array.isArray(body.events) ? body.events.slice(0, MAX_EVENTS) : [];
    const fallbackSession =
      typeof body.session_id === 'string' ? body.session_id.slice(0, 64) : null;

    const rows: AnalyticsRow[] = events
      .map((e): AnalyticsRow | null => {
        const name = typeof e.name === 'string' ? e.name.slice(0, MAX_NAME_LEN) : '';
        const session =
          typeof e.session_id === 'string' ? e.session_id.slice(0, 64) : fallbackSession;
        if (!name || !session) return null;
        return {
          session_id: session,
          name,
          props: sanitizeProps(e.props),
          path: typeof e.path === 'string' ? e.path.slice(0, MAX_PATH_LEN) : null,
        };
      })
      .filter((row): row is AnalyticsRow => row !== null);

    if (rows.length === 0) {
      return NextResponse.json({ ok: true, inserted: 0 });
    }

    const db = getSupabaseAdminClient();
    if (!db) {
      return NextResponse.json({ ok: false });
    }

    const { error } = await db.from('analytics_events').insert(rows);
    if (error) {
      return NextResponse.json({ ok: false });
    }

    return NextResponse.json({ ok: true, inserted: rows.length });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
