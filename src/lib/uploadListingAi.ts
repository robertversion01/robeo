import { ollamaGenerate } from '@/lib/ollamaClient';

export type ListingAiInput = {
  category: string;
  brand: string;
  size: string;
  condition: string;
  price: string;
  imageCount: number;
};

export type ListingAiSuggestion = {
  name: string;
  description: string;
};

function parseJsonBlock(raw: string): ListingAiSuggestion | null {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const o = JSON.parse(match[0]) as { name?: string; description?: string };
    if (!o.name || !o.description) return null;
    return {
      name: String(o.name).slice(0, 120),
      description: String(o.description).slice(0, 2000),
    };
  } catch {
    return null;
  }
}

/** Magyar hirdetés szöveg javaslat — llama3 @ Ollama */
export async function suggestListingCopy(
  input: ListingAiInput,
): Promise<{ ok: true; data: ListingAiSuggestion } | { ok: false; error: string }> {
  const prompt = `Te egy Vinted-stílusú használtruha piactér asszisztens vagy. Adj rövid, eladható magyar hirdetést.
Kategória: ${input.category}
Márka: ${input.brand}
Méret: ${input.size}
Állapot: ${input.condition}
Ár (Ft): ${input.price}
Képek száma: ${input.imageCount}

Válasz KIZÁRÓLAG valid JSON formában, semmi más szöveg:
{"name":"...","description":"..."}
A name max 80 karakter. A description 2-4 mondat, őszinte, Vinted hangnem.`;

  const res = await ollamaGenerate(prompt, { maxTokens: 320 });
  if (!res.ok) return res;

  const parsed = parseJsonBlock(res.text);
  if (!parsed) {
    return { ok: false, error: 'parse_failed' };
  }
  return { ok: true, data: parsed };
}
