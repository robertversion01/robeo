import type { SupabaseClient } from '@supabase/supabase-js';
import { isSupabaseSchemaError } from '@/lib/supabaseResilience';

export type PriceSnapshot = {
  price: number;
  recordedAt: string;
};

const LOCAL_KEY = 'robeo_price_history_v1';

function readLocal(): Record<string, PriceSnapshot[]> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}') as Record<string, PriceSnapshot[]>;
  } catch {
    return {};
  }
}

function writeLocal(map: Record<string, PriceSnapshot[]>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_KEY, JSON.stringify(map));
}

export function recordLocalPriceSnapshot(productId: string, price: number): PriceSnapshot[] {
  const map = readLocal();
  const prev = map[productId] || [];
  const last = prev[prev.length - 1];
  const rounded = Math.round(price);
  if (last && last.price === rounded) return prev;
  const snap: PriceSnapshot = { price: rounded, recordedAt: new Date().toISOString() };
  const next = [...prev, snap].slice(-30);
  map[productId] = next;
  writeLocal(map);
  return next;
}

export function getLocalPriceHistory(productId: string): PriceSnapshot[] {
  return readLocal()[productId] || [];
}

export function getLatestLocalPrice(productId: string): number | null {
  const hist = getLocalPriceHistory(productId);
  if (hist.length === 0) return null;
  return hist[hist.length - 1].price;
}

export function hasPriceDropped(productId: string, currentPrice: number): boolean {
  const hist = getLocalPriceHistory(productId);
  if (hist.length < 2) return false;
  const prev = hist[hist.length - 2].price;
  return Math.round(currentPrice) < prev;
}

/** Supabase `product_price_snapshots` — ha a patch futott */
export async function recordPriceSnapshotRemote(
  supabase: SupabaseClient,
  productId: string,
  price: number,
): Promise<boolean> {
  try {
    const { error } = await supabase.from('product_price_snapshots').insert({
      product_id: productId,
      price_huf: Math.round(price),
    });
    if (error) {
      if (!isSupabaseSchemaError(error)) {
        console.warn('[priceHistory] remote insert failed', error.message);
      }
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function fetchRemotePriceHistory(
  supabase: SupabaseClient,
  productId: string,
  limit = 20,
): Promise<PriceSnapshot[]> {
  try {
    const { data, error } = await supabase
      .from('product_price_snapshots')
      .select('price_huf, created_at')
      .eq('product_id', productId)
      .order('created_at', { ascending: true })
      .limit(limit);
    if (error || !data) return [];
    return data.map((row) => ({
      price: Math.round(Number((row as { price_huf?: number }).price_huf) || 0),
      recordedAt: String((row as { created_at?: string }).created_at || ''),
    }));
  } catch {
    return [];
  }
}

export async function recordPriceSnapshot(
  supabase: SupabaseClient,
  productId: string,
  price: number,
): Promise<PriceSnapshot[]> {
  const local = recordLocalPriceSnapshot(productId, price);
  void recordPriceSnapshotRemote(supabase, productId, price);
  return local;
}

export async function getPriceHistory(
  supabase: SupabaseClient,
  productId: string,
): Promise<PriceSnapshot[]> {
  const remote = await fetchRemotePriceHistory(supabase, productId);
  if (remote.length > 0) return remote;
  return getLocalPriceHistory(productId);
}
