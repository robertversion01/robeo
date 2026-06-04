import type { SupabaseClient } from '@supabase/supabase-js';

export type SellerInsightRow = {
  totalSales: number;
  grossRevenue: number;
  netRevenue: number;
  avgSalePrice: number;
  lastMonthRevenue: number;
  monthlyBuckets: Array<{ month: string; revenue: number; count: number }>;
  topProducts: Array<{ productId: string; name: string; soldCount: number; revenue: number }>;
};

const EMPTY: SellerInsightRow = {
  totalSales: 0,
  grossRevenue: 0,
  netRevenue: 0,
  avgSalePrice: 0,
  lastMonthRevenue: 0,
  monthlyBuckets: [],
  topProducts: [],
};

const PAID_STATUSES = ['fizetve', 'feladva', 'uton', 'atvetelre_var', 'leszallitva', 'completed'];

function bucketKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function ensureMonthlyBuckets(buckets: Map<string, { revenue: number; count: number }>, months = 6) {
  const now = new Date();
  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = bucketKey(d);
    if (!buckets.has(key)) buckets.set(key, { revenue: 0, count: 0 });
  }
}

export async function fetchSellerInsights(
  supabase: SupabaseClient,
  sellerId: string,
): Promise<SellerInsightRow> {
  if (!sellerId) return EMPTY;

  const { data: txs, error } = await supabase
    .from('transactions')
    .select('id, status, amount, fee, shipping_cost, product_id, created_at')
    .eq('seller_id', sellerId)
    .in('status', PAID_STATUSES);

  if (error) {
    console.warn('[sellerInsights] transactions fetch failed', error.message);
    return EMPTY;
  }

  const rows = (txs ?? []) as Array<{
    id: string;
    status: string;
    amount: number | null;
    fee: number | null;
    shipping_cost: number | null;
    product_id: string;
    created_at: string;
  }>;

  if (rows.length === 0) return EMPTY;

  const monthlyMap = new Map<string, { revenue: number; count: number }>();
  ensureMonthlyBuckets(monthlyMap, 6);

  let grossRevenue = 0;
  let netRevenue = 0;
  const productRevenueMap = new Map<string, { soldCount: number; revenue: number }>();
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 1);

  let lastMonthRevenue = 0;

  for (const r of rows) {
    const gross = Math.round(Number(r.amount) || 0);
    const fee = Math.round(Number(r.fee) || 0);
    const shipping = Math.round(Number(r.shipping_cost) || 0);
    const net = Math.max(0, gross - fee - shipping);

    grossRevenue += gross;
    netRevenue += net;

    const created = new Date(r.created_at);
    const key = bucketKey(created);
    if (monthlyMap.has(key)) {
      const m = monthlyMap.get(key)!;
      m.revenue += net;
      m.count += 1;
    }
    if (created >= cutoff) {
      lastMonthRevenue += net;
    }

    const cur = productRevenueMap.get(r.product_id) || { soldCount: 0, revenue: 0 };
    cur.soldCount += 1;
    cur.revenue += net;
    productRevenueMap.set(r.product_id, cur);
  }

  const productIds = [...productRevenueMap.keys()];
  let nameMap = new Map<string, string>();
  if (productIds.length > 0) {
    const { data: products } = await supabase
      .from('products')
      .select('id, name')
      .in('id', productIds);
    if (products) {
      nameMap = new Map(products.map((p) => [p.id as string, (p.name as string) ?? '']));
    }
  }

  const topProducts = [...productRevenueMap.entries()]
    .map(([productId, info]) => ({
      productId,
      name: nameMap.get(productId) || 'Termék',
      soldCount: info.soldCount,
      revenue: info.revenue,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const totalSales = rows.length;
  const avgSalePrice = totalSales > 0 ? Math.round(netRevenue / totalSales) : 0;
  const monthlyBuckets = [...monthlyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, info]) => ({ month, revenue: info.revenue, count: info.count }));

  return {
    totalSales,
    grossRevenue,
    netRevenue,
    avgSalePrice,
    lastMonthRevenue,
    monthlyBuckets,
    topProducts,
  };
}
