-- Futtasd a Supabase SQL Editorban, ha a termékoldalon 403/üres eladó profil jön.
DROP POLICY IF EXISTS "Public can view seller profiles for marketplace" ON public.profiles;
CREATE POLICY "Public can view seller profiles for marketplace"
  ON public.profiles FOR SELECT
  USING (true);
