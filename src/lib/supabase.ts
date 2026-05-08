import { createClient } from '@supabase/supabase-js';

let supabaseInstance: ReturnType<typeof createClient> | null = null;
let supabaseInitAttempted = false;

export const getSupabaseClient = () => {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  if (supabaseInitAttempted) {
    return null;
  }

  supabaseInitAttempted = true;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing Supabase environment variables. Supabase client is unavailable.');
    return null;
  }

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  return supabaseInstance;
};

function getRequiredSupabaseClient() {
  const client = getSupabaseClient();

  if (!client) {
    throw new Error(
      'Supabase client is unavailable. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
    );
  }

  return client;
}

export const supabase: any = new Proxy({} as any, {
  get(_target, prop, receiver) {
    const client = getRequiredSupabaseClient();
    const value = Reflect.get(client, prop, receiver);

    if (typeof value === 'function') {
      return value.bind(client);
    }

    return value;
  },
});
