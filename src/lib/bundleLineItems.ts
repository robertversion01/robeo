import type { SupabaseClient } from '@supabase/supabase-js';

export type TransactionLineItem = {
  id: string;
  transaction_id: string;
  product_id: string;
  product_name: string;
  unit_price_huf: number;
  quantity: number;
  sort_order: number;
};

export type BundleLineProduct = {
  id: string;
  name: string;
  price: number;
  image_url?: string | null;
};

export async function insertTransactionLineItems(
  db: SupabaseClient,
  transactionId: string,
  products: BundleLineProduct[],
): Promise<void> {
  if (products.length === 0) return;

  const rows = products.map((p, idx) => ({
    transaction_id: transactionId,
    product_id: p.id,
    product_name: p.name,
    unit_price_huf: Math.round(p.price),
    quantity: 1,
    sort_order: idx,
  }));

  const { error } = await db.from('transaction_line_items').insert(rows);
  if (error) {
    console.warn('[bundleLineItems] insert failed (table may be missing)', error.message);
  }
}

export function parseBundleProductIdsFromTransaction(tx: {
  product_id: string;
  bundle_product_ids?: string | null;
  bundle_item_count?: number | null;
}): string[] {
  const raw = tx.bundle_product_ids?.trim();
  if (!raw) return [tx.product_id];
  const ids = raw.split(',').map((s) => s.trim()).filter(Boolean);
  return ids.length > 0 ? [...new Set(ids)] : [tx.product_id];
}

export async function fetchTransactionLineItems(
  db: SupabaseClient,
  transactionId: string,
): Promise<TransactionLineItem[]> {
  const { data, error } = await db
    .from('transaction_line_items')
    .select('id, transaction_id, product_id, product_name, unit_price_huf, quantity, sort_order')
    .eq('transaction_id', transactionId)
    .order('sort_order', { ascending: true });

  if (error || !data) return [];
  return data as TransactionLineItem[];
}

/** Line items tábla vagy bundle_product_ids + products join */
export async function resolveBundleDisplayItems(
  db: SupabaseClient,
  tx: {
    id: string;
    product_id: string;
    bundle_product_ids?: string | null;
  },
): Promise<BundleLineProduct[]> {
  const fromTable = await fetchTransactionLineItems(db, tx.id);
  if (fromTable.length > 0) {
    const ids = fromTable.map((r) => r.product_id);
    const { data: imgs } = await db.from('products').select('id, image_url').in('id', ids);
    const imgMap = new Map((imgs || []).map((p) => [p.id as string, p.image_url as string | null]));
    return fromTable.map((r) => ({
      id: r.product_id,
      name: r.product_name,
      price: r.unit_price_huf,
      image_url: imgMap.get(r.product_id) ?? null,
    }));
  }

  const ids = parseBundleProductIdsFromTransaction(tx);
  if (ids.length <= 1) return [];

  const { data: products } = await db
    .from('products')
    .select('id, name, price, image_url')
    .in('id', ids);

  if (!products?.length) return [];
  const order = new Map(ids.map((id, i) => [id, i]));
  return [...products]
    .sort((a, b) => (order.get(a.id as string) ?? 0) - (order.get(b.id as string) ?? 0))
    .map((p) => ({
      id: p.id as string,
      name: p.name as string,
      price: Math.round(Number(p.price) || 0),
      image_url: (p.image_url as string) ?? null,
    }));
}

export function isBundleTransaction(tx: {
  bundle_product_ids?: string | null;
  bundle_item_count?: number | null;
}): boolean {
  const count = Number(tx.bundle_item_count) || 0;
  if (count >= 2) return true;
  const ids = parseBundleProductIdsFromTransaction({
    product_id: '',
    bundle_product_ids: tx.bundle_product_ids,
  });
  return ids.length >= 2;
}
