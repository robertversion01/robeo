-- ROBEO Vinted Legal — invoices, GDPR profile fields, realtime
-- Futtatás: Supabase SQL Editor, majd NOTIFY pgrst, 'reload schema';

-- ─── 1. Profiles — legal acceptance & soft-delete ───────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS legal_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS legal_version TEXT,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS account_anonymized BOOLEAN NOT NULL DEFAULT false;

-- ─── 2. Demo invoices ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  total_amount INTEGER NOT NULL CHECK (total_amount >= 0),
  fee_amount INTEGER NOT NULL DEFAULT 0 CHECK (fee_amount >= 0),
  shipping_amount INTEGER NOT NULL DEFAULT 0 CHECK (shipping_amount >= 0),
  product_amount INTEGER NOT NULL DEFAULT 0 CHECK (product_amount >= 0),
  pdf_url TEXT,
  demo_mode BOOLEAN NOT NULL DEFAULT true,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (transaction_id, user_id),
  UNIQUE (invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_invoices_user_created
  ON public.invoices(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_invoices_transaction
  ON public.invoices(transaction_id);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoices_select_own" ON public.invoices;
CREATE POLICY "invoices_select_own"
  ON public.invoices FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT ON public.invoices TO authenticated;

-- Service role inserts from API (no INSERT policy for authenticated)

-- Realtime (optional — skip if publication already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'invoices'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices;
  END IF;
EXCEPTION
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
END $$;

NOTIFY pgrst, 'reload schema';
