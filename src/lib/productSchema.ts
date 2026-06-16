/**
 * products oszlopok — séma probe + scan select (saved-search worker, API).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Product } from '@/types';
import { LISTED_PRODUCT_STATUS_FILTER } from '@/lib/listedProducts';

export type ProductScanRow = Pick<
  Product,
  | 'id'
  | 'name'
  | 'description'
  | 'brand'
  | 'category'
  | 'size'
  | 'condition'
  | 'color'
  | 'price'
  | 'budapest_district'
>;

const PRODUCT_SCAN_BASE =
  'id, name, description, brand, category, condition, color, price, created_at';
const PRODUCT_SCAN_WITH_SIZE = `${PRODUCT_SCAN_BASE}, size`;

let sizeColumnCache: boolean | null = null;
let districtColumnCache: boolean | null = null;

function isMissingColumnError(message: string | undefined, column: string): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return m.includes(column.toLowerCase()) && (m.includes('does not exist') || m.includes('column'));
}

/** Egyszeri probe: létezik-e a products.size oszlop (PostgREST cache után is). */
export async function productsHasSizeColumn(supabase: SupabaseClient): Promise<boolean> {
  if (sizeColumnCache !== null) return sizeColumnCache;
  const { error } = await supabase.from('products').select('size').limit(1);
  if (!error) {
    sizeColumnCache = true;
    return true;
  }
  if (isMissingColumnError(error.message, 'size')) {
    sizeColumnCache = false;
    return false;
  }
  // Egyéb hiba — ne cache-eljük, de ne törjük el a scan-t
  return false;
}

/** Egyszeri probe: létezik-e a products.budapest_district oszlop (RobeoBP). */
export async function productsHasDistrictColumn(supabase: SupabaseClient): Promise<boolean> {
  if (districtColumnCache !== null) return districtColumnCache;
  const { error } = await supabase.from('products').select('budapest_district').limit(1);
  if (!error) {
    districtColumnCache = true;
    return true;
  }
  if (isMissingColumnError(error.message, 'budapest_district')) {
    districtColumnCache = false;
    return false;
  }
  return false;
}

export function resetProductSchemaCache() {
  sizeColumnCache = null;
  districtColumnCache = null;
}

export async function resolveProductScanSelect(supabase: SupabaseClient): Promise<string> {
  const hasSize = await productsHasSizeColumn(supabase);
  const hasDistrict = await productsHasDistrictColumn(supabase);
  let select = hasSize ? PRODUCT_SCAN_WITH_SIZE : PRODUCT_SCAN_BASE;
  if (hasDistrict) select = `${select}, budapest_district`;
  return select;
}

export async function fetchProductsForScan(
  supabase: SupabaseClient,
  limit: number,
): Promise<{ data: ProductScanRow[]; error: Error | null }> {
  const select = await resolveProductScanSelect(supabase);
  const { data, error } = await supabase
    .from('products')
    .select(select)
    .or(LISTED_PRODUCT_STATUS_FILTER)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return { data: [], error: new Error(error.message) };
  }

  const rows: ProductScanRow[] = ((data ?? []) as unknown as ProductScanRow[]).map((row) => ({
    id: String(row.id),
    name: String(row.name ?? ''),
    description: String(row.description ?? ''),
    brand: row.brand ?? undefined,
    category: String(row.category ?? ''),
    condition: row.condition ?? undefined,
    color: row.color ?? undefined,
    price: Number(row.price) || 0,
    size: row.size ?? null,
    budapest_district: row.budapest_district ?? null,
  }));

  return { data: rows, error: null };
}

/** Browse: szerver oldali size filter csak ha az oszlop létezik. */
export async function canFilterProductsBySize(supabase: SupabaseClient): Promise<boolean> {
  return productsHasSizeColumn(supabase);
}

export { isMissingColumnError };
