-- ============================================================
-- ROBEO 1.5 - Adatbázis szinkron migráció
--
-- Realtime (élő ajánlat / üzenet): Supabase Dashboard → Database →
-- Replication → supabase_realtime → add `offers`, `messages`.
-- SQL: supabase/patch-realtime-replication.sql
-- Dátum: 2026-05-07
-- Leírás: kanonikus migrációs forrás (schema + RLS + indexek)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. products tábla - hiányzó oszlopok hozzáadása
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS condition TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS favorite_count INTEGER DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS featured_until TIMESTAMPTZ;

-- 2. offers tábla - hiányzó oszlopok hozzáadása
-- Megjegyzés: régi sémán a `price` NOT NULL; az app `offered_price`-ot is tölt.
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS offered_price INTEGER;
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

-- Eladó / chat partner megjelenítő adatok (termékoldal, üzenetek) — csak olvasás
DROP POLICY IF EXISTS "Public can view seller profiles for marketplace" ON public.profiles;
CREATE POLICY "Public can view seller profiles for marketplace"
  ON public.profiles FOR SELECT
  USING (true);

-- 3/b Profiles — opcionális mezők (webhook / UI; régi DB-n ADD COLUMN IF NOT EXISTS)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address_line1 TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address_line2 TEXT;

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
DROP POLICY IF EXISTS "Offer participants can update" ON public.offers;
CREATE POLICY "Offer participants can update"
  ON public.offers FOR UPDATE
  TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id)
  WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- 9. Ellenőrző lekérdezések (megjegyzésként)
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'products';
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'offers';
-- SELECT * FROM public.profiles LIMIT 10;

-- 10. Reviews tábla (kétirányú értékeléshez)
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id UUID NOT NULL,
  reviewed_id UUID NOT NULL,
  offer_id UUID,
  transaction_id UUID,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.reviews
  ADD COLUMN IF NOT EXISTS transaction_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_unique_transaction_reviewer
  ON public.reviews(transaction_id, reviewer_id)
  WHERE transaction_id IS NOT NULL;

-- 11. Favorites tábla
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT favorites_user_product_unique UNIQUE (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_product_id ON public.favorites(product_id);

-- 12. Transactions tábla kiegészítése checkout flow-hoz
ALTER TABLE IF EXISTS public.transactions
  ADD COLUMN IF NOT EXISTS fee INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS checkout_session_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS transfer_id TEXT,
  ADD COLUMN IF NOT EXISTS shipping_method TEXT,
  ADD COLUMN IF NOT EXISTS shipping_cost INTEGER NOT NULL DEFAULT 0;

UPDATE public.transactions
SET status = 'fizetve'
WHERE status IN ('paid', 'payment_succeeded');

CREATE INDEX IF NOT EXISTS idx_transactions_checkout_session ON public.transactions(checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_intent ON public.transactions(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);

-- 12/b Stripe webhook idempotencia (újrapróbált eseményekhez)
ALTER TABLE IF EXISTS public.transactions
  ADD COLUMN IF NOT EXISTS checkout_completed_notified_at TIMESTAMPTZ;

ALTER TABLE IF EXISTS public.products
  ADD COLUMN IF NOT EXISTS featured_checkout_session_id TEXT;

-- 12/c Feldolgozott Stripe webhook események (evt_…) — idempotencia + hibanapló
-- Futtasd egyben ezt a blokkot (CREATE + RLS + REVOKE). Ha a Studio csak a CREATE-ot kéri:
-- válaszd a „Run and enable RLS” opciót, majd futtasd a REVOKE sorokat külön is.
-- Önálló, teljes szkript: supabase/sql/apply_stripe_webhook_events.sql
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  stripe_event_id TEXT PRIMARY KEY,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_type TEXT,
  payload JSONB,
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  error TEXT
);

-- Hiányzó oszlopok (régi táblán is lefut)
ALTER TABLE public.stripe_webhook_events ADD COLUMN IF NOT EXISTS event_type TEXT;
ALTER TABLE public.stripe_webhook_events ADD COLUMN IF NOT EXISTS payload JSONB;
ALTER TABLE public.stripe_webhook_events ADD COLUMN IF NOT EXISTS processed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.stripe_webhook_events ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;
ALTER TABLE public.stripe_webhook_events ADD COLUMN IF NOT EXISTS error TEXT;

-- Ritka: egyszerre létezett id ÉS stripe_event_id (félbemaradt migráció) — egyesítés, PK javítás
DO $$
DECLARE
  pk_rec RECORD;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'stripe_webhook_events' AND column_name = 'id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'stripe_webhook_events' AND column_name = 'stripe_event_id'
  ) THEN
    UPDATE public.stripe_webhook_events t
    SET stripe_event_id = t.id
    WHERE t.stripe_event_id IS NULL OR btrim(t.stripe_event_id) = '';

    FOR pk_rec IN
      SELECT c.conname
      FROM pg_constraint c
      WHERE c.conrelid = 'public.stripe_webhook_events'::regclass
        AND c.contype = 'p'
    LOOP
      EXECUTE format('ALTER TABLE public.stripe_webhook_events DROP CONSTRAINT %I', pk_rec.conname);
    END LOOP;

    ALTER TABLE public.stripe_webhook_events DROP COLUMN id;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint c
      WHERE c.conrelid = 'public.stripe_webhook_events'::regclass
        AND c.contype = 'p'
    ) THEN
      ALTER TABLE public.stripe_webhook_events
        ADD CONSTRAINT stripe_webhook_events_pkey PRIMARY KEY (stripe_event_id);
    END IF;
  END IF;
END $$;

-- Régi séma: csak id — átnevezés stripe_event_id-re (csak ha még nincs stripe_event_id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'stripe_webhook_events' AND column_name = 'id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'stripe_webhook_events' AND column_name = 'stripe_event_id'
  ) THEN
    ALTER TABLE public.stripe_webhook_events RENAME COLUMN id TO stripe_event_id;
  END IF;
END $$;

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- Kliens kulcsokkal ne legyen REST hozzáférés (webhook csak service_role-nel ír).
REVOKE ALL ON TABLE public.stripe_webhook_events FROM anon;
REVOKE ALL ON TABLE public.stripe_webhook_events FROM authenticated;

COMMENT ON TABLE public.stripe_webhook_events IS 'Stripe evt_* — service_role; payload audit; processed + processed_at.';
COMMENT ON COLUMN public.stripe_webhook_events.payload IS 'Stripe Event JSON (audit).';
COMMENT ON COLUMN public.stripe_webhook_events.processed IS 'true ha a handler lefutott hiba nélkül.';
COMMENT ON COLUMN public.stripe_webhook_events.error IS 'Feldolgozási hiba szöveg (HTTP válasz mindig 200).';

-- 13. Offers lifecycle mezők
ALTER TABLE IF EXISTS public.offers
  ADD COLUMN IF NOT EXISTS counter_price INTEGER,
  ADD COLUMN IF NOT EXISTS counter_message TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'offers_minimum_60_percent'
  ) THEN
    ALTER TABLE public.offers
      ADD CONSTRAINT offers_minimum_60_percent
      CHECK (
        offered_price >= 1
      );
  END IF;
END $$;

-- 13/b Offer minimum hardening at DB level:
-- require offered_price >= 60% of the referenced product price.
CREATE OR REPLACE FUNCTION public.enforce_offer_minimum_60_percent()
RETURNS trigger AS $$
DECLARE
  product_price INTEGER;
  minimum_allowed INTEGER;
BEGIN
  SELECT price INTO product_price
  FROM public.products
  WHERE id = NEW.product_id;

  IF product_price IS NULL THEN
    RAISE EXCEPTION 'Invalid product_id for offer';
  END IF;

  minimum_allowed := CEIL(product_price * 0.60);
  IF NEW.offered_price < minimum_allowed THEN
    RAISE EXCEPTION 'Offer must be at least 60%% of product price (%).', minimum_allowed;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_offer_minimum_60_percent ON public.offers;
CREATE TRIGGER trg_enforce_offer_minimum_60_percent
BEFORE INSERT OR UPDATE OF offered_price, product_id ON public.offers
FOR EACH ROW
EXECUTE FUNCTION public.enforce_offer_minimum_60_percent();

-- 13/c Legacy `price` ↔ `offered_price` szinkron (INSERT/UPDATE)
CREATE OR REPLACE FUNCTION public.sync_offer_price_columns()
RETURNS trigger AS $$
BEGIN
  IF NEW.offered_price IS NOT NULL AND (NEW.price IS NULL OR NEW.price = 0) THEN
    NEW.price := NEW.offered_price;
  ELSIF NEW.price IS NOT NULL AND (NEW.offered_price IS NULL OR NEW.offered_price = 0) THEN
    NEW.offered_price := NEW.price;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_offer_price_columns ON public.offers;
CREATE TRIGGER trg_sync_offer_price_columns
BEFORE INSERT OR UPDATE ON public.offers
FOR EACH ROW
EXECUTE FUNCTION public.sync_offer_price_columns();

-- 14. Üzenetek média támogatása
ALTER TABLE IF EXISTS public.messages
  ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS media_url TEXT;

-- 15. Chat média storage bucket + policy
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "chat_media_upload_authenticated" ON storage.objects;
CREATE POLICY "chat_media_upload_authenticated"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-media');

DROP POLICY IF EXISTS "chat_media_read_public" ON storage.objects;
CREATE POLICY "chat_media_read_public"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'chat-media');

-- 16. RLS policy-k transactions/reviews/favorites táblákhoz
ALTER TABLE IF EXISTS public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transactions_insert_checkout" ON public.transactions;
CREATE POLICY "transactions_insert_checkout"
ON public.transactions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "transactions_update_participants" ON public.transactions;
CREATE POLICY "transactions_update_participants"
ON public.transactions
FOR UPDATE
TO authenticated
USING (auth.uid() = buyer_id OR auth.uid() = seller_id)
WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id);

DROP POLICY IF EXISTS "transactions_select_participants" ON public.transactions;
CREATE POLICY "transactions_select_participants"
ON public.transactions
FOR SELECT
TO authenticated
USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

ALTER TABLE IF EXISTS public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_insert_authenticated" ON public.reviews;
CREATE POLICY "reviews_insert_authenticated"
ON public.reviews
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = reviewer_id);

DROP POLICY IF EXISTS "reviews_select_public" ON public.reviews;
CREATE POLICY "reviews_select_public"
ON public.reviews
FOR SELECT
TO public
USING (true);

ALTER TABLE IF EXISTS public.favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "favorites_select_own" ON public.favorites;
CREATE POLICY "favorites_select_own"
ON public.favorites
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "favorites_insert_own" ON public.favorites;
CREATE POLICY "favorites_insert_own"
ON public.favorites
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "favorites_delete_own" ON public.favorites;
CREATE POLICY "favorites_delete_own"
ON public.favorites
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 17. Products read policy for public live search/grid
ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_select_public_active" ON public.products;
CREATE POLICY "products_select_public_active"
ON public.products
FOR SELECT
TO anon, authenticated
USING (
  COALESCE(status, 'active') <> 'deleted'
);

DROP POLICY IF EXISTS "products_insert_own" ON public.products;
CREATE POLICY "products_insert_own"
ON public.products FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "products_update_own" ON public.products;
CREATE POLICY "products_update_own"
ON public.products FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

COMMENT ON POLICY "products_select_public_active" ON public.products IS
  'Publikus lista / keresés: csak nem törölt (soft delete kiesik).';
COMMENT ON POLICY "products_insert_own" ON public.products IS
  'Új termék: csak saját user_id-val.';
COMMENT ON POLICY "products_update_own" ON public.products IS
  'Csak a tulajdonos módosíthat (UPDATE); törlés = status = deleted (hard DELETE nincs engedélyezve kliensen).';

-- Hard DELETE nem engedélyezett authenticated számára (nincs DELETE policy → tiltva).

-- 18. Reviews schema expansion for product-level buyer/seller feedback
ALTER TABLE IF EXISTS public.reviews
  ADD COLUMN IF NOT EXISTS product_id UUID,
  ADD COLUMN IF NOT EXISTS seller_id UUID,
  ADD COLUMN IF NOT EXISTS buyer_id UUID;