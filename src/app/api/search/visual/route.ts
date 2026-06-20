import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { runVisualProductSearch } from '@/lib/visualSearch';
import { isOllamaServerReachable } from '@/lib/ollamaServer';
import { isVisualSearchEnabled, visualSearchDisabledMessage } from '@/lib/ollamaFeature';

export const dynamic = 'force-dynamic';

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

function supabaseAnon() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key);
}

/** Képes keresés — lokális Ollama vision (llava), nincs külső API. */
export async function POST(req: NextRequest) {
  try {
    if (!isVisualSearchEnabled()) {
      return NextResponse.json(
        { error: 'visual_search_disabled', hint: visualSearchDisabledMessage() },
        { status: 503 },
      );
    }

    const reachable = await isOllamaServerReachable();
    if (!reachable) {
      return NextResponse.json(
        { error: 'ollama_unreachable', hint: 'Start Ollama on localhost:11434 and pull llava' },
        { status: 503 },
      );
    }

    const body = (await req.json()) as { imageBase64?: string };
    const raw = body.imageBase64?.trim();
    if (!raw) {
      return NextResponse.json({ error: 'image_required' }, { status: 400 });
    }

    const base64 = raw.replace(/^data:image\/\w+;base64,/, '');
    const approxBytes = Math.ceil((base64.length * 3) / 4);
    if (approxBytes > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'image_too_large' }, { status: 413 });
    }

    const supabase = supabaseAnon();
    if (!supabase) {
      return NextResponse.json({ error: 'supabase_unconfigured' }, { status: 503 });
    }

    const result = await runVisualProductSearch(supabase, base64);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    return NextResponse.json({ ok: true, ...result.data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'visual_search_failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
