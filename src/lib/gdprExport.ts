import type { SupabaseClient } from '@supabase/supabase-js';

export async function buildGdprExportBundle(
  db: SupabaseClient,
  userId: string,
): Promise<Record<string, unknown>> {
  const exportedAt = new Date().toISOString();

  const [profileRes, walletRes, walletTxRes, txBuyerRes, txSellerRes, invoicesRes, productsRes] =
    await Promise.all([
      db.from('profiles').select('*').eq('id', userId).maybeSingle(),
      db.from('wallets').select('*').eq('user_id', userId).maybeSingle(),
      db
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(500),
      db
        .from('transactions')
        .select('*')
        .eq('buyer_id', userId)
        .order('created_at', { ascending: false })
        .limit(200),
      db
        .from('transactions')
        .select('*')
        .eq('seller_id', userId)
        .order('created_at', { ascending: false })
        .limit(200),
      db
        .from('invoices')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(200),
      db
        .from('products')
        .select('id, name, price, status, created_at, updated_at')
        .eq('user_id', userId)
        .limit(500),
    ]);

  return {
    exportVersion: 'robeo-gdpr-v1',
    exportedAt,
    userId,
    profile: profileRes.data ?? null,
    wallet: walletRes.data ?? null,
    walletTransactions: walletTxRes.data ?? [],
    purchasesAsBuyer: txBuyerRes.data ?? [],
    salesAsSeller: txSellerRes.data ?? [],
    invoices: invoicesRes.data ?? [],
    listings: productsRes.data ?? [],
    notice:
      'DEMO / TESZT export — személyes adatok a ROBEO demó környezetből. Nem minősül hivatalos adatszolgáltatásnak.',
  };
}

export async function softAnonymizeProfile(
  db: SupabaseClient,
  userId: string,
): Promise<{ ok: boolean; error?: string }> {
  const now = new Date().toISOString();
  const anonEmail = `deleted-${userId.slice(0, 8)}@anonymized.robeo.local`;

  const { error } = await db
    .from('profiles')
    .update({
      email: anonEmail,
      full_name: 'Törölt felhasználó',
      name: 'Törölt felhasználó',
      bio: null,
      avatar_url: null,
      phone: null,
      address_line1: null,
      address_line2: null,
      city: null,
      postal_code: null,
      country: null,
      deleted_at: now,
      account_anonymized: true,
      updated_at: now,
    })
    .eq('id', userId);

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
