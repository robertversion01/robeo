const OLLAMA_BASE =
  process.env.OLLAMA_URL?.trim() ||
  process.env.NEXT_PUBLIC_OLLAMA_URL?.trim() ||
  'http://localhost:11434';

const VISION_MODEL = process.env.OLLAMA_VISION_MODEL?.trim() || 'llava';

export type OllamaServerResult =
  | { ok: true; text: string }
  | { ok: false; error: string };

export function getOllamaServerBase(): string {
  return OLLAMA_BASE;
}

export async function isOllamaServerReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, { method: 'GET', cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
}

/** Lokális vision modell — rövid JSON leírás kereső kulcsszavakhoz. */
export async function ollamaVisionDescribe(imageBase64: string): Promise<OllamaServerResult> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: VISION_MODEL,
        messages: [
          {
            role: 'user',
            content:
              'Fashion/marketplace item in photo. Reply ONLY valid JSON, no markdown: {"query":"short hungarian search phrase","keywords":["brand","type","color"]}',
            images: [imageBase64],
          },
        ],
        stream: false,
        options: { num_predict: 120, temperature: 0.2 },
      }),
      cache: 'no-store',
    });

    if (!res.ok) return { ok: false, error: `ollama_http_${res.status}` };

    const data = (await res.json()) as { message?: { content?: string } };
    const text = (data.message?.content || '').trim();
    if (!text) return { ok: false, error: 'empty_response' };
    return { ok: true, text };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'ollama_unreachable' };
  }
}
