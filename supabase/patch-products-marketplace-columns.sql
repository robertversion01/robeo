-- products.size + marketplace oszlopok (saved-search worker, browse filter, upload)
-- Futtatás: Supabase SQL Editor — vagy: node scripts/apply-supabase-patch.mjs patch-products-marketplace-columns.sql

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS size TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS color TEXT;

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS bundle_product_ids TEXT;

CREATE INDEX IF NOT EXISTS idx_products_size ON public.products(size) WHERE size IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_brand_size ON public.products(brand, size);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS seller_verified BOOLEAN NOT NULL DEFAULT false;

-- PostgREST séma cache frissítés
NOTIFY pgrst, 'reload schema';
