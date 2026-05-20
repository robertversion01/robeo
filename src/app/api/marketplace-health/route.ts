import { getMarketplaceHealthResponse } from '@/lib/marketplaceHealth';

/** Alias — ha /api/health/* régi deploy/cache miatt 404, ez ugyanazt adja vissza */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return getMarketplaceHealthResponse();
}
