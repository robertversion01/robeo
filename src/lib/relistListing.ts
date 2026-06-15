import type { SupabaseClient } from '@supabase/supabase-js';
import type { Product } from '@/types';
import { ROBEO_BP_MODE } from '@/lib/features';
import { isValidBudapestDistrict } from '@/lib/budapestDistricts';
import { isMissingColumnError } from '@/lib/productSchema';

export async function relistProduct(
  supabase: SupabaseClient,
  productId: string,
  userId: string,
): Promise<{ id: string } | { error: string }> {
  const { data: source, error: fetchError } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .eq('user_id', userId)
    .maybeSingle();

  if (fetchError || !source) {
    return { error: fetchError?.message || 'not_found' };
  }

  const row = source as Product & { style_tags?: string[] | null; defect_images?: string[] | null };
  const images = (row.images || []).filter(Boolean);
  const imageUrl = row.image_url || images[0] || null;

  const payload: Record<string, unknown> = {
    name: row.name,
    description: row.description,
    price: row.price,
    category: row.category,
    condition: row.condition || 'good',
    brand: row.brand || null,
    size: row.size || null,
    color: row.color || null,
    image_url: imageUrl,
    images: images.length > 0 ? images : imageUrl ? [imageUrl] : [],
    user_id: userId,
    status: 'active',
  };

  if (ROBEO_BP_MODE && isValidBudapestDistrict(row.budapest_district)) {
    payload.budapest_district = row.budapest_district;
  }
  if (Array.isArray(row.style_tags) && row.style_tags.length > 0) {
    payload.style_tags = row.style_tags;
  }

  let { data: inserted, error: insertError } = await supabase
    .from('products')
    .insert(payload)
    .select('id')
    .single();

  if (insertError?.message?.includes('style_tags') && isMissingColumnError(insertError.message, 'style_tags')) {
    delete payload.style_tags;
    ({ data: inserted, error: insertError } = await supabase
      .from('products')
      .insert(payload)
      .select('id')
      .single());
  }

  if (insertError || !inserted) {
    return { error: insertError?.message || 'insert_failed' };
  }

  return { id: String((inserted as { id: string }).id) };
}
