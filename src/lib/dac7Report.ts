import type { SupabaseClient } from '@supabase/supabase-js';

/** EU DAC7 demo thresholds for marketplace seller reporting. */
export const DAC7_MIN_SALES = 30;
export const DAC7_MIN_EARNINGS_HUF = 800_000;

export type Dac7FlaggedSeller = {
  userId: string;
  email: string | null;
  displayName: string | null;
  completedSales: number;
  cumulativeEarningsHuf: number;
  walletReleaseTotalHuf: number;
  flaggedReasons: string[];
};

export async function fetchDac7FlaggedSellers(
  db: SupabaseClient,
): Promise<Dac7FlaggedSeller[]> {
  const { data: completedTx, error: txErr } = await db
    .from('transactions')
    .select('id, seller_id, amount, fee, shipping_cost, status')
    .eq('status', 'sikeresen_atveve');

  if (txErr) {
    throw new Error(txErr.message);
  }

  const bySeller = new Map<
    string,
    { sales: number; earnings: number; txIds: string[] }
  >();

  for (const tx of completedTx || []) {
    const sellerId = tx.seller_id as string;
    if (!sellerId) continue;
    const amount = Math.round(Number(tx.amount) || 0);
    const fee = Math.round(Number(tx.fee) || 0);
    const shipping = Math.round(Number(tx.shipping_cost) || 0);
    const net = Math.max(0, amount - fee - shipping);

    const cur = bySeller.get(sellerId) ?? { sales: 0, earnings: 0, txIds: [] };
    cur.sales += 1;
    cur.earnings += net;
    cur.txIds.push(tx.id as string);
    bySeller.set(sellerId, cur);
  }

  const { data: walletRows } = await db
    .from('wallet_transactions')
    .select('user_id, amount_huf, entry_type, status')
    .eq('entry_type', 'release')
    .eq('status', 'completed');

  const walletByUser = new Map<string, number>();
  for (const row of walletRows || []) {
    const uid = row.user_id as string;
    walletByUser.set(uid, (walletByUser.get(uid) ?? 0) + Math.round(Number(row.amount_huf) || 0));
  }

  const flaggedIds = [...bySeller.entries()]
    .filter(([, v]) => v.sales > DAC7_MIN_SALES || v.earnings >= DAC7_MIN_EARNINGS_HUF)
    .map(([id]) => id);

  if (flaggedIds.length === 0) return [];

  const { data: profiles } = await db
    .from('profiles')
    .select('id, email, full_name, name')
    .in('id', flaggedIds);

  const profileMap = new Map(
    (profiles || []).map((p) => [
      p.id as string,
      {
        email: (p.email as string) ?? null,
        displayName: (p.full_name as string) || (p.name as string) || null,
      },
    ]),
  );

  const results: Dac7FlaggedSeller[] = [];

  for (const [userId, agg] of bySeller.entries()) {
    const reasons: string[] = [];
    if (agg.sales > DAC7_MIN_SALES) {
      reasons.push(`${agg.sales} sikeres eladás (>${DAC7_MIN_SALES})`);
    }
    if (agg.earnings >= DAC7_MIN_EARNINGS_HUF) {
      reasons.push(
        `${agg.earnings.toLocaleString('hu-HU')} Ft nettó bevétel (≥${DAC7_MIN_EARNINGS_HUF.toLocaleString('hu-HU')} Ft)`,
      );
    }
    const walletRelease = walletByUser.get(userId) ?? 0;
    if (walletRelease >= DAC7_MIN_EARNINGS_HUF && !reasons.some((r) => r.includes('bevétel'))) {
      reasons.push(
        `${walletRelease.toLocaleString('hu-HU')} Ft wallet release (≥${DAC7_MIN_EARNINGS_HUF.toLocaleString('hu-HU')} Ft)`,
      );
    }

    if (reasons.length === 0) continue;

    const prof = profileMap.get(userId);
    results.push({
      userId,
      email: prof?.email ?? null,
      displayName: prof?.displayName ?? null,
      completedSales: agg.sales,
      cumulativeEarningsHuf: agg.earnings,
      walletReleaseTotalHuf: walletRelease,
      flaggedReasons: reasons,
    });
  }

  return results.sort((a, b) => b.cumulativeEarningsHuf - a.cumulativeEarningsHuf);
}

export function dac7ReportToCsv(rows: Dac7FlaggedSeller[]): string {
  const header = [
    'user_id',
    'email',
    'display_name',
    'completed_sales',
    'cumulative_earnings_huf',
    'wallet_release_huf',
    'flagged_reasons',
  ].join(',');

  const lines = rows.map((r) =>
    [
      r.userId,
      csvEscape(r.email ?? ''),
      csvEscape(r.displayName ?? ''),
      String(r.completedSales),
      String(r.cumulativeEarningsHuf),
      String(r.walletReleaseTotalHuf),
      csvEscape(r.flaggedReasons.join('; ')),
    ].join(','),
  );

  return [header, ...lines].join('\n');
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
