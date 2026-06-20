import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { buildFeedEarlyHintLinks, isEarlyHintsEnabled } from '@/lib/feedEarlyHints';

const FEED_PATHS = new Set(['/', '/browse']);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!FEED_PATHS.has(pathname) || !isEarlyHintsEnabled()) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  try {
    const links = await buildFeedEarlyHintLinks();
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
