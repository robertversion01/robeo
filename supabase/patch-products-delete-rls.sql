-- Futtasd a Supabase SQL Editorban, ha a termék törlés (soft delete) 403 / RLS hibát ad.
-- A kliens UPDATE { status: 'deleted' } — fizikai DELETE nincs engedélyezve.

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_update_own" ON public.products;
CREATE POLICY "products_update_own"
  ON public.products
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Tulajdonos látja a saját (törölt / eladott) termékeit is a profilon.
DROP POLICY IF EXISTS "products_select_own" ON public.products;
CREATE POLICY "products_select_own"
  ON public.products
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE ON public.products TO authenticated;
