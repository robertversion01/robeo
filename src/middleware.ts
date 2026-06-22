import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  buildFeedEarlyHintLinks,
  getCachedFeedEarlyHintLinks,
  isEarlyHintsEnabled,
} from '@/lib/feedEarlyHints';

const FEED_PATHS = new Set(['/', '/browse']);
const HINT_WAIT_MS = 250;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!FEED_PATHS.has(pathname) || !isEarlyHintsEnabled()) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  const cached = getCachedFeedEarlyHintLinks();
  if (cached.length > 0) {
    response.headers.set('Link', cached.join(', '));
    void buildFeedEarlyHintLinks();
    return response;
  }

  try {
    const links = await Promise.race([
      buildFeedEarlyHintLinks(),
      new Promise<string[]>((resolve) => {
        setTimeout(() => resolve([]), HINT_WAIT_MS);
      }),
    ]);
    if (links.length > 0) {
      response.headers.set('Link', links.join(', '));
    }
  } catch {
    /* Early hints opcionális */
  }

  return response;
}

export const config = {
  matcher: ['/', '/browse'],
};
