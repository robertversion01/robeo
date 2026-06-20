import type { Product } from '@/types';

/** Feed grid — duplikált id-k kiszűrése (lapozás / merge artefaktum). */
export function dedupeProductsById<T extends Pick<Product, 'id'>>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    if (!item.id || seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}
