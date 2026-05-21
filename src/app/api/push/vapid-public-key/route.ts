import { NextResponse } from 'next/server';
import { getVapidPublicKey } from '@/lib/webPushConfig';

export const dynamic = 'force-dynamic';

export async function GET() {
  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    return NextResponse.json({ publicKey: null, configured: false });
  }
  return NextResponse.json({ publicKey, configured: true });
}
