import type { SupabaseClient } from '@supabase/supabase-js';
import { ollamaVisionDescribe } from '@/lib/ollamaServer';
import { fetchListedProductTypeahead, type ProductTypeaheadRow } from '@/lib/listedProducts';

export type VisualSearchResult = {
  query: string;
  keywords: string[];
  products: ProductTypeaheadRow[];
};

function parseVisionJson(raw: string): { query: string; keywords: string[] } | null {
  const trimmed = raw.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]) as { query?: string; keywords?: unknown };
    const query = String(parsed.query || '').trim();
    const keywords = Array.isArray(parsed.keywords)
      ? parsed.keywords.map((k) => String(k).trim()).filter((k) => k.length > 1)
      : [];
    if (query.length >= 2) return { query, keywords };
    if (keywords.length > 0) return { query: keywords.slice(0, 4).join(' '), keywords };
    return null;
  } catch {
    return null;
  }
}

export async function runVisualProductSearch(
  supabase: SupabaseClient,
  imageBase64: string,
): Promise<{ ok: true; data: VisualSearchResult } | { ok: false; error: string }> {
  const vision = await ollamaVisionDescribe(imageBase64);
  if (!vision.ok) return { ok: false, error: vision.error };

  const parsed = parseVisionJson(vision.text);
  if (!parsed) return { ok: false, error: 'vision_parse_failed' };

  const products = await fetchListedProductTypeahead(supabase, parsed.query, 16);
  if (products.length === 0 && parsed.keywords.length > 0) {
    const fallback = await fetchListedProductTypeahead(
      supabase,
      parsed.keywords.slice(0, 2).join(' '),
      16,
    );
    return {
      ok: true,
      data: { query: parsed.query, keywords: parsed.keywords, products: fallback },
    };
  }

  return { ok: true, data: { query: parsed.query, keywords: parsed.keywords, products } };
}
