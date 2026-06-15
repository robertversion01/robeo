import type { SupabaseClient } from '@supabase/supabase-js';
import type { Product } from '@/types';
import { getDepartmentForCategory } from '@/lib/marketplaceTaxonomy';

export type ListingDefaultSnapshot = {
  category: string;
  condition: string;
  brand: string;
  size: string;
  color: string;
  budapestDistrict: string;
  listingType: 'product' | 'service';
  departmentId: string;
  subcategoryId: string;
};

export async function fetchLastListingDefaults(
  supabase: SupabaseClient,
  userId: string,
): Promise<ListingDefaultSnapshot | null> {
  const { data, error } = await supabase
    .from('products')
    .select('category, condition, brand, size, color, budapest_district')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as Pick<
    Product,
    'category' | 'condition' | 'brand' | 'size' | 'color' | 'budapest_district'
  >;
  const category = row.category || '';
  const departmentId = category ? getDepartmentForCategory(category) || '' : '';

  return {
    category,
    condition: row.condition || '',
    brand: row.brand || '',
    size: row.size || '',
    color: row.color || '',
    budapestDistrict: row.budapest_district || '',
    listingType: row.condition === 'service' ? 'service' : 'product',
    departmentId,
    subcategoryId: category,
  };
}
