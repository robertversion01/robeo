import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  isValidUsername,
  normalizeUsername,
  suggestUsername,
} from '@/lib/profileRegistration';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get('username') ?? '';
  const username = normalizeUsername(raw);

  if (!username) {
    return NextResponse.json({ available: false, error: 'missing' }, { status: 400 });
  }

  if (!isValidUsername(username)) {
    return NextResponse.json({
      available: false,
      error: 'invalid',
      suggestion: suggestUsername(username.slice(0, 8)),
    });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.json({ available: true });
  }

  const db = createClient(url, key);
  const excludeId = searchParams.get('excludeId');

  let query = db.from('profiles').select('id').ilike('name', username).limit(1);
  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data, error } = await query;

  if (error) {
    console.warn('[check-username]', error.message);
    return NextResponse.json({ available: true });
  }

  const taken = (data?.length ?? 0) > 0;
  if (taken) {
    return NextResponse.json({
      available: false,
      suggestion: suggestUsername(username.slice(0, 10)),
    });
  }

  return NextResponse.json({ available: true });
}
