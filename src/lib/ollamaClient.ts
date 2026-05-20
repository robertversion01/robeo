const OLLAMA_BASE = process.env.NEXT_PUBLIC_OLLAMA_URL || 'http://localhost:11434';
const CHAT_MODEL = process.env.NEXT_PUBLIC_OLLAMA_CHAT_MODEL || 'llama3';

export type OllamaGenerateResult =
  | { ok: true; text: string }
  | { ok: false; error: string };

/**
 * Lokális Ollama (localhost:11434) — csak böngészőből / dev API route-ból hívandó.
 * RTX 3060: rövid prompt, alacsony token limit.
 */
export async function ollamaGenerate(
  prompt: string,
  options?: { maxTokens?: number; temperature?: number },
): Promise<OllamaGenerateResult> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: CHAT_MODEL,
        prompt,
        stream: false,
        options: {
          num_predict: options?.maxTokens ?? 280,
          temperature: options?.temperature ?? 0.4,
        },
      }),
    });

    if (!res.ok) {
      return { ok: false, error: `Ollama HTTP ${res.status}` };
    }

    const data = (await res.json()) as { response?: string };
    const text = (data.response || '').trim();
    if (!text) return { ok: false, error: 'empty_response' };
    return { ok: true, text };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'ollama_unreachable';
    return { ok: false, error: msg };
  }
}

export async function isOllamaReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}
