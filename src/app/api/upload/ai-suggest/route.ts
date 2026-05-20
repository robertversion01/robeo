import { NextRequest, NextResponse } from 'next/server';
import { suggestListingCopy, type ListingAiInput } from '@/lib/uploadListingAi';
import { isOllamaReachable } from '@/lib/ollamaClient';

export const dynamic = 'force-dynamic';

/** Szerver oldali Ollama proxy — lokál dev / saját host (OLLAMA_URL env). */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ListingAiInput;
    if (!body?.category || !body?.brand) {
      return NextResponse.json({ error: 'category and brand required' }, { status: 400 });
    }

    const reachable = await isOllamaReachable();
    if (!reachable) {
      return NextResponse.json(
        { error: 'ollama_unreachable', hint: 'Start Ollama on localhost:11434' },
        { status: 503 },
      );
    }

    const result = await suggestListingCopy(body);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }
    return NextResponse.json({ ok: true, data: result.data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'ai_failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
