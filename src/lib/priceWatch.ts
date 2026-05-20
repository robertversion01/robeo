const STORAGE_KEY = 'robeo_price_watch_v1';

export type PriceWatchEntry = {
  productId: string;
  productName: string;
  lastPrice: number;
  watchedAt: string;
  alertEnabled: boolean;
};

function readAll(): PriceWatchEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PriceWatchEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(items: PriceWatchEntry[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function listPriceWatches(): PriceWatchEntry[] {
  return readAll();
}

export function upsertPriceWatch(entry: Omit<PriceWatchEntry, 'watchedAt'> & { watchedAt?: string }) {
  const items = readAll();
  const next: PriceWatchEntry = {
    ...entry,
    watchedAt: entry.watchedAt || new Date().toISOString(),
  };
  const filtered = items.filter((i) => i.productId !== entry.productId);
  writeAll([next, ...filtered]);
}

export function removePriceWatch(productId: string) {
  writeAll(readAll().filter((i) => i.productId !== productId));
}

export type PriceDropHit = {
  productId: string;
  productName: string;
  oldPrice: number;
  newPrice: number;
};

export function detectPriceDrops(
  products: Array<{ id: string; name: string; price: number }>,
): PriceDropHit[] {
  const watches = readAll().filter((w) => w.alertEnabled);
  const hits: PriceDropHit[] = [];
  for (const w of watches) {
    const p = products.find((x) => x.id === w.productId);
    if (!p) continue;
    if (p.price < w.lastPrice) {
      hits.push({
        productId: p.id,
        productName: p.name,
        oldPrice: w.lastPrice,
        newPrice: p.price,
      });
      upsertPriceWatch({
        productId: p.id,
        productName: p.name,
        lastPrice: p.price,
        alertEnabled: w.alertEnabled,
      });
    }
  }
  return hits;
}
