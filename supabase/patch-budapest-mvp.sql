-- ============================================================================
-- patch-budapest-mvp.sql -- RobeoBP (Budapest Beta) tagitas
--
-- Cel: a budapest-i beta MVP-hez szukseges minimalis schema kiegeszites.
--
-- Biztonsag:
--   - 100% idempotens: ujra-es-ujra futtathato a Supabase SQL Editorban
--   - SOHA semmit nem torol (DROP nelkuli, kizarolag ADD muveletek)
--   - Fuggetlen a tobbi patch-tol (patch-vinted-masterpiece, dispute, blocks stb.)
--   - V1 marketplace teljes funkcionalitasat erintetlenul hagyja
--
-- Mit ad hozza:
--   1. products.budapest_district (text)  -- romai szam, peldaul "VIII"
--   2. b-tree index a szurore             -- csak NEM-NULL sorokon (partial)
--
-- A 'local_pickup_pending' transactions.status ertek nem igenyel schema
-- modositast: a meglevo oszlop free-form text, csak az alkalmazas logikaja
-- ismeri fel. Ezzel a V1 status ertekeket (fizetve, payment_pending,
-- shipped, delivered, disputed, refunded, stb.) nem zavarjuk meg.
-- ============================================================================

ALTER TABLE IF EXISTS public.products
  ADD COLUMN IF NOT EXISTS budapest_district text;

COMMENT ON COLUMN public.products.budapest_district IS
  'RobeoBP (Budapest Beta): romai szamu kerulet (I, II, ..., XXIII) lokalis atvetelhez. NULL = nem Budapest-specifikus termek (V1 mod). Valid: I, II, III, IV, V, VI, VII, VIII, IX, X, XI, XII, XIII, XIV, XV, XVI, XVII, XVIII, XIX, XX, XXI, XXII, XXIII.';

-- Partial index: csak a kitoltott ertekeken, hogy a NULL tobbseg ne hizlalja az indexet.
CREATE INDEX IF NOT EXISTS idx_products_budapest_district
  ON public.products (budapest_district)
  WHERE budapest_district IS NOT NULL;

-- ============================================================================
-- Ellenorzo lekerdezesek (manualisan, Supabase SQL Editorban):
--
--   SELECT column_name, data_type, is_nullable
--   FROM information_schema.columns
--   WHERE table_schema = 'public'
--     AND table_name = 'products'
--     AND column_name = 'budapest_district';
--
--   SELECT indexname FROM pg_indexes
--   WHERE schemaname = 'public' AND tablename = 'products'
--     AND indexname = 'idx_products_budapest_district';
-- ============================================================================
