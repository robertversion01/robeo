import { imageFromPreset } from '@/lib/imagePresets';
import { normalizePrimaryProductImageUrl } from '@/lib/productImageValidation';

/** Mobilon 2 kép elég — kevesebb edge terhelés, mégis LCP win. */
const FEED_HINT_COUNT = 2;
const HINT_CACHE_MS = 60_000;
const HINT_FETCH_TIMEOUT_MS = 400;

type HintRow = { image_url?: string | null; images?: unknown };

let cachedAt = 0;
let cachedLinks: string[] = [];
let refreshInFlight: Promise<string[]> | null = null;

export function isEarlyHintsEnabled(): boolean {
  return process.env.EARLY_HINTS_ENABLED !== 'false';
}

/** Middleware: azonnali cache — nem blokkol fetchre. */
export function getCachedFeedEarlyHintLinks(): string[] {
  return cachedLinks;
}

function formatLinkHeader(url: string): string {
  return `<${url}>; rel=preload; as=image; type=image/webp`;
}

async function fetchFeedImageUrls(limit: number): Promise<string[]> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!base || !key) return [];

  const params = new URLSearchParams({
    select: 'image_url,images',
    or: '(status.eq.active,status.is.null)',
    order: 'created_at.desc',
    limit: String(limit),
  });

  const res = await fetch(`${base}/rest/v1/products?${params}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
    },
    next: { revalidate: 60 },
    signal: AbortSignal.timeout(HINT_FETCH_TIMEOUT_MS),
  });

  if (!res.ok) return [];

  const rows = (await res.json()) as HintRow[];
  const urls: string[] = [];

  for (const row of rows) {
    const raw = normalizePrimaryProductImageUrl(row);
    if (!raw) continue;
    const src = imageFromPreset(raw, 'homepageFeed', { priority: true }).src;
    if (src) urls.push(src);
  }

  return urls;
}

/** Link header értékek — Vercel edge 103 Early Hints. */
export async function buildFeedEarlyHintLinks(): Promise<string[]> {
  if (!isEarlyHintsEnabled()) return [];

  const now = Date.now();
  if (cachedLinks.length > 0 && now - cachedAt < HINT_CACHE_MS) {
    return cachedLinks;
  }

  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    try {
      const imageUrls = await fetchFeedImageUrls(FEED_HINT_COUNT);
      const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

      const links: string[] = [];
      if (supabaseOrigin) {
        try {
          const origin = new URL(supabaseOrigin).origin;
          links.push(`<${origin}>; rel=preconnect; crossorigin`);
        } catch {
          /* ignore */
        }
      }

      for (const url of imageUrls) {
        links.push(formatLinkHeader(url));
      }

      cachedLinks = links;
      cachedAt = Date.now();
      return links;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}
