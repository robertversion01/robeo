-- Futtasd a Supabase SQL Editorban, ha az új feltöltött termékek nem jelennek meg a főoldalon (RLS).
-- A profil saját termékeihez külön tulajdonosi SELECT policy is kell (eladott / törölt).

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_select_public_active" ON public.products;
DROP POLICY IF EXISTS "Allow public read access for active products" ON public.products;

CREATE POLICY "Allow public read access for active products"
  ON public.products
  FOR SELECT
  TO anon, authenticated
  USING (status = 'active' OR status IS NULL);

-- Profil: saját termékek (sold, deleted stb.) — OR kapcsolatban a publikus policy-val.
DROP POLICY IF EXISTS "products_select_own" ON public.products;
CREATE POLICY "products_select_own"
  ON public.products
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
