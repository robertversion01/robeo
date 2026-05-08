import { createClient } from '@supabase/supabase-js';

let supabaseInstance: ReturnType<typeof createClient> | null = null;
let supabaseInitAttempted = false;
let supabaseAdminInstance: ReturnType<typeof createClient> | null = null;
let supabaseAdminInitAttempted = false;

export const getSupabaseClient = () => {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  if (supabaseInitAttempted) {
    return null;
  }

  supabaseInitAttempted = true;

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY;

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

export const getSupabaseAdminClient = () => {
  if (typeof window !== 'undefined') return null;
  if (supabaseAdminInstance) return supabaseAdminInstance;
  if (supabaseAdminInitAttempted) return null;

  supabaseAdminInitAttempted = true;

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn('Missing SUPABASE_SERVICE_ROLE_KEY. Admin Supabase client is unavailable.');
    return null;
  }

  supabaseAdminInstance = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return supabaseAdminInstance;
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

function createNoopQueryBuilder(message: string) {
  const result = { data: [] as any[], error: null as any };
  const singleResult = { data: null as any, error: null as any };

  const builder: any = {
    select: () => builder,
    eq: () => builder,
    neq: () => builder,
    gt: () => builder,
    gte: () => builder,
    lt: () => builder,
    lte: () => builder,
    or: () => builder,
    not: () => builder,
    in: () => builder,
    is: () => builder,
    order: () => builder,
    limit: () => builder,
    insert: () => builder,
    update: () => builder,
    delete: () => builder,
    upsert: () => builder,
    then: (resolve: any, reject?: any) => Promise.resolve(result).then(resolve, reject),
    single: async () => singleResult,
    maybeSingle: async () => singleResult,
  };

  return builder;
}

function createNoopSupabaseClient(message: string) {
  const authError = new Error(message);

  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: authError }),
      signInWithPassword: async () => ({ data: { user: null, session: null }, error: authError }),
      signUp: async () => ({ data: { user: null, session: null }, error: authError }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
    },
    from: () => createNoopQueryBuilder(message),
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: authError }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
      }),
    },
    channel: () => ({
      on() {
        return this;
      },
      subscribe() {
        return this;
      },
    }),
    removeChannel: () => {},
    removeAllChannels: () => {},
  };
}

export const supabase: any = new Proxy({} as any, {
  get(_target, prop, receiver) {
    const client = getSupabaseClient();
    const fallbackMessage =
      'Supabase client is unavailable. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.';
    const effectiveClient =
      client || (typeof window !== 'undefined' ? createNoopSupabaseClient(fallbackMessage) : null);

    if (!effectiveClient) {
      const requiredClient = getRequiredSupabaseClient();
      const requiredValue = Reflect.get(requiredClient, prop, receiver);
      if (typeof requiredValue === 'function') {
        return requiredValue.bind(requiredClient);
      }
      return requiredValue;
    }

    const value = Reflect.get(effectiveClient, prop, receiver);

    if (typeof value === 'function') {
      return value.bind(effectiveClient);
    }

    return value;
  },
});
