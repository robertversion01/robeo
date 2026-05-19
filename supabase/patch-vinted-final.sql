-- ROBEO Vinted Final — reports + Stripe Connect profil mezők. Futtasd a SQL Editorban.

-- ─── Stripe Connect (eladó bankszámla onboarding) ───────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS connected_account_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_connect_onboarded BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_connect_details_submitted BOOLEAN NOT NULL DEFAULT false;

-- Kompatibilitás a meglévő checkout kóddal
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_connected_account
  ON public.profiles(connected_account_id)
  WHERE connected_account_id IS NOT NULL;

-- ─── Termék bejelentések (moderáció) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'counterfeit', 'prohibited')),
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'dismissed', 'actioned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_reports_status_created
  ON public.reports(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reports_product
  ON public.reports(product_id);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_insert_authenticated" ON public.reports;
CREATE POLICY "reports_insert_authenticated"
  ON public.reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "reports_select_own" ON public.reports;
CREATE POLICY "reports_select_own"
  ON public.reports FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id);

GRANT SELECT, INSERT ON public.reports TO authenticated;

-- Admin műveletek service role-lal (API) — nincs nyilvános UPDATE policy

-- Kifizetés napló (opcionális audit)
CREATE TABLE IF NOT EXISTS public.wallet_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount > 0),
  stripe_transfer_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.wallet_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wallet_payouts_select_own" ON public.wallet_payouts;
CREATE POLICY "wallet_payouts_select_own"
  ON public.wallet_payouts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT ON public.wallet_payouts TO authenticated;
