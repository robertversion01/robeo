-- Community & trust bovites: seller valasz a review-kra, listing Q&A, user/uzenet jelentes
-- Lokalis, ingyenes. Futtasd a Supabase SQL Editorban, majd: NOTIFY pgrst, 'reload schema';

-- 1) Eladoi valasz a kapott ertekelesre
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS seller_response TEXT,
  ADD COLUMN IF NOT EXISTS seller_response_at TIMESTAMPTZ;

-- 2) Listing Q&A (nyilvanos kerdes-valasz a termekeknel)
CREATE TABLE IF NOT EXISTS public.product_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  asker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT,
  answered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_questions_product
  ON public.product_questions(product_id, created_at DESC);

ALTER TABLE public.product_questions ENABLE ROW LEVEL SECURITY;

-- Mindenki olvashatja a nyilvanos Q&A-t
DROP POLICY IF EXISTS "pq_select_all" ON public.product_questions;
CREATE POLICY "pq_select_all"
  ON public.product_questions FOR SELECT TO anon, authenticated
  USING (true);

-- Bejelentkezett (nem az elado) tehet fel kerdest
DROP POLICY IF EXISTS "pq_insert_asker" ON public.product_questions;
CREATE POLICY "pq_insert_asker"
  ON public.product_questions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = asker_id AND auth.uid() <> seller_id);

-- Csak az elado valaszolhat (sajat termek kerdesere)
DROP POLICY IF EXISTS "pq_update_seller" ON public.product_questions;
CREATE POLICY "pq_update_seller"
  ON public.product_questions FOR UPDATE TO authenticated
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

GRANT SELECT ON public.product_questions TO anon;
GRANT SELECT, INSERT, UPDATE ON public.product_questions TO authenticated;

-- 3) Felhasznalo / uzenet jelentes (a termek-jelentestol fuggetlen)
CREATE TABLE IF NOT EXISTS public.user_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  context TEXT NOT NULL DEFAULT 'message'
    CHECK (context IN ('message', 'profile', 'meetup', 'other')),
  reason TEXT NOT NULL DEFAULT 'other'
    CHECK (reason IN ('harassment', 'scam', 'spam', 'inappropriate', 'no_show', 'other')),
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'dismissed', 'actioned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT user_reports_no_self CHECK (reporter_id <> reported_id)
);

CREATE INDEX IF NOT EXISTS idx_user_reports_status
  ON public.user_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_reports_reported
  ON public.user_reports(reported_id);

ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_reports_insert_own" ON public.user_reports;
CREATE POLICY "user_reports_insert_own"
  ON public.user_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "user_reports_select_own" ON public.user_reports;
CREATE POLICY "user_reports_select_own"
  ON public.user_reports FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id);

GRANT SELECT, INSERT ON public.user_reports TO authenticated;

-- Idempotens: mar letezo user_reports tablan is engedjuk a no_show / meetup ertekeket.
ALTER TABLE public.user_reports DROP CONSTRAINT IF EXISTS user_reports_context_check;
ALTER TABLE public.user_reports
  ADD CONSTRAINT user_reports_context_check
  CHECK (context IN ('message', 'profile', 'meetup', 'other'));

ALTER TABLE public.user_reports DROP CONSTRAINT IF EXISTS user_reports_reason_check;
ALTER TABLE public.user_reports
  ADD CONSTRAINT user_reports_reason_check
  CHECK (reason IN ('harassment', 'scam', 'spam', 'inappropriate', 'no_show', 'other'));

NOTIFY pgrst, 'reload schema';
