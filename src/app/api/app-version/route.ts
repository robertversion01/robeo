import { NextResponse } from 'next/server';
import { getAppBuildId } from '@/lib/appBuild';

export const dynamic = 'force-dynamic';

export async function GET() {
  const buildId = getAppBuildId();
  return NextResponse.json(
    { buildId, deployedAt: process.env.VERCEL_DEPLOYMENT_ID ?? null },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        Pragma: 'no-cache',
      },
    },
  );
}
