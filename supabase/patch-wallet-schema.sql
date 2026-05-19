-- Vinted-stílusú belső egyenleg (wallets). Futtasd a Supabase SQL Editorban.

CREATE TABLE IF NOT EXISTS public.wallets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  available_balance INTEGER NOT NULL DEFAULT 0 CHECK (available_balance >= 0),
  pending_balance INTEGER NOT NULL DEFAULT 0 CHECK (pending_balance >= 0),
  currency TEXT NOT NULL DEFAULT 'HUF',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallets_updated_at ON public.wallets(updated_at);

-- Idempotens wallet műveletek tranzakciónként
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS wallet_pending_credited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS wallet_released_at TIMESTAMPTZ;

-- Meglévő felhasználóknak üres pénztárca
INSERT INTO public.wallets (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Új regisztráció: profil + pénztárca
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, created_at)
  VALUES (NEW.id, NEW.email, NEW.created_at)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.wallets (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Letét: fizetéskor pending += nettó eladói összeg
CREATE OR REPLACE FUNCTION public.credit_wallet_pending(p_user_id UUID, p_amount INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN;
  END IF;

  INSERT INTO public.wallets (user_id, pending_balance, available_balance, currency)
  VALUES (p_user_id, p_amount, 0, 'HUF')
  ON CONFLICT (user_id) DO UPDATE
  SET
    pending_balance = public.wallets.pending_balance + EXCLUDED.pending_balance,
    updated_at = NOW();
END;
$$;

-- Átvétel után: pending → available
CREATE OR REPLACE FUNCTION public.release_wallet_pending_to_available(p_user_id UUID, p_amount INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_pending INTEGER;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN;
  END IF;

  INSERT INTO public.wallets (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT pending_balance INTO current_pending
  FROM public.wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF current_pending IS NULL THEN
    current_pending := 0;
  END IF;

  UPDATE public.wallets
  SET
    pending_balance = GREATEST(0, current_pending - p_amount),
    available_balance = available_balance + LEAST(current_pending, p_amount),
    updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$;

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wallets_select_own" ON public.wallets;
CREATE POLICY "wallets_select_own"
  ON public.wallets
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Egyenleg módosítás csak backend (service role / SECURITY DEFINER RPC)
GRANT SELECT ON public.wallets TO authenticated;

GRANT EXECUTE ON FUNCTION public.credit_wallet_pending(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_wallet_pending_to_available(UUID, INTEGER) TO service_role;

-- Realtime: profil egyenlegkártya
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;
