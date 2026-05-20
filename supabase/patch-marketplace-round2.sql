-- ROBEO marketplace round 2 — ár-történet, worker state (opcionális)
-- Futtatás: Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.product_price_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  price_huf INTEGER NOT NULL CHECK (price_huf >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_price_snapshots_product_created
  ON public.product_price_snapshots(product_id, created_at DESC);

ALTER TABLE public.product_price_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "price_snapshots_select_authenticated" ON public.product_price_snapshots;
CREATE POLICY "price_snapshots_select_authenticated"
  ON public.product_price_snapshots FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "price_snapshots_insert_authenticated" ON public.product_price_snapshots;
CREATE POLICY "price_snapshots_insert_authenticated"
  ON public.product_price_snapshots FOR INSERT TO authenticated WITH CHECK (true);

GRANT SELECT, INSERT ON public.product_price_snapshots TO authenticated;

-- Követő értesítés (ha még nincs a patch-vinted-masterpiece.sql-ből)
CREATE OR REPLACE FUNCTION public.notify_followers_new_product()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seller_name TEXT;
BEGIN
  IF NEW.status IS DISTINCT FROM 'active' AND NEW.status IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(p.full_name, p.name, split_part(p.email, '@', 1), 'Eladó')
  INTO seller_name
  FROM public.profiles p
  WHERE p.id = NEW.user_id;

  INSERT INTO public.app_notifications (user_id, type, title, body, link, is_read)
  SELECT
    f.follower_id,
    'seller_new_item',
    seller_name || ' feltöltött egy új terméket!',
    NEW.name,
    '/products/' || NEW.id::text,
    false
  FROM public.follows f
  WHERE f.following_id = NEW.user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_followers_new_product ON public.products;
CREATE TRIGGER trg_notify_followers_new_product
  AFTER INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_followers_new_product();
