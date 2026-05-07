-- ============================================================
-- ROBEO 1.5 - Adatbázis szinkron migráció
-- Dátum: 2026-05-07
-- Leírás: products, offers, profiles táblák kiegészítése
-- ============================================================

-- 1. products tábla - hiányzó oszlopok hozzáadása
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS condition TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

-- 2. offers tábla - hiányzó oszlopok hozzáadása
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS shipping_method TEXT;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS shipping_cost INTEGER DEFAULT 0;

-- 3. profiles tábla létrehozása (a hiányzó `users` tábla helyett)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Trigger: új regisztrációnál automatikusan hozza létre a profilt
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, created_at)
  VALUES (NEW.id, NEW.email, NEW.created_at);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Meglévő felhasználók profiljának feltöltése
INSERT INTO public.profiles (id, email)
SELECT id, email FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 6. RLS engedélyezése a profiles táblán
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 7. RLS policy-k a profiles táblához
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- 8. RLS az offers táblához (ha még nincs)
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own offers" ON public.offers;
CREATE POLICY "Users can view their own offers"
  ON public.offers FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

DROP POLICY IF EXISTS "Users can insert offers" ON public.offers;
CREATE POLICY "Users can insert offers"
  ON public.offers FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Sellers can update offers" ON public.offers;
CREATE POLICY "Sellers can update offers"
  ON public.offers FOR UPDATE
  USING (auth.uid() = seller_id);

-- 9. Ellenőrző lekérdezések (megjegyzésként)
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'products';
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'offers';
-- SELECT * FROM public.profiles LIMIT 10;