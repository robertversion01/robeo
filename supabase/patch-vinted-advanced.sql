-- ROBEO Vinted Advanced — Foxpost tracking, price watches, wallet ledger
-- Futtatás: Supabase SQL Editor, majd NOTIFY pgrst, 'reload schema';

-- ─── 1. Transactions — Foxpost tracking ─────────────────────────────────────
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS tracking_carrier TEXT DEFAULT 'foxpost',
  ADD COLUMN IF NOT EXISTS label_generated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_transactions_tracking
  ON public.transactions(tracking_number)
  WHERE tracking_number IS NOT NULL;

-- ─── 2. Price watches (server cron) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.price_watches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  target_price_huf INTEGER CHECK (target_price_huf IS NULL OR target_price_huf >= 0),
  last_seen_price_huf INTEGER NOT NULL DEFAULT 0 CHECK (last_seen_price_huf >= 0),
  last_notified_price_huf INTEGER,
  alert_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_price_watches_user_enabled
  ON public.price_watches(user_id)
  WHERE alert_enabled = true;

CREATE INDEX IF NOT EXISTS idx_price_watches_product
  ON public.price_watches(product_id);

ALTER TABLE public.price_watches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "price_watches_select_own" ON public.price_watches;
CREATE POLICY "price_watches_select_own"
  ON public.price_watches FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "price_watches_insert_own" ON public.price_watches;
CREATE POLICY "price_watches_insert_own"
  ON public.price_watches FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "price_watches_update_own" ON public.price_watches;
CREATE POLICY "price_watches_update_own"
  ON public.price_watches FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "price_watches_delete_own" ON public.price_watches;
CREATE POLICY "price_watches_delete_own"
  ON public.price_watches FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.price_watches TO authenticated;

-- ─── 3. Wallet transaction ledger ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  entry_type TEXT NOT NULL CHECK (
    entry_type IN ('credit_pending', 'release', 'cashout', 'debit', 'adjustment')
  ),
  amount_huf INTEGER NOT NULL CHECK (amount_huf >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'completed', 'failed')
  ),
  description TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_created
  ON public.wallet_transactions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_tx
  ON public.wallet_transactions(transaction_id)
  WHERE transaction_id IS NOT NULL;

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wallet_transactions_select_own" ON public.wallet_transactions;
CREATE POLICY "wallet_transactions_select_own"
  ON public.wallet_transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT ON public.wallet_transactions TO authenticated;

NOTIFY pgrst, 'reload schema';
