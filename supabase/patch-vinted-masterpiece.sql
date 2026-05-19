-- ROBEO Vinted Masterpiece — futtasd a Supabase SQL Editorban (egy blokkban).

-- ─── Foxpost automata + fizetés meta ─────────────────────────────────────────
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS foxpost_terminal_id TEXT,
  ADD COLUMN IF NOT EXISTS foxpost_terminal_name TEXT,
  ADD COLUMN IF NOT EXISTS foxpost_terminal_address TEXT,
  ADD COLUMN IF NOT EXISTS wallet_amount_paid INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT 'stripe',
  ADD COLUMN IF NOT EXISTS bundle_item_count INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS bundle_discount_percent INTEGER NOT NULL DEFAULT 0;

-- ─── Termék méret + profil csomagkedvezmény ───────────────────────────────────
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS size TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bundle_discount_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bundle_discount_tiers JSONB NOT NULL DEFAULT
    '[{"items":2,"percent":10},{"items":3,"percent":15},{"items":5,"percent":20}]'::jsonb;

-- ─── Követések ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.follows (
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT follows_no_self CHECK (follower_id <> following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_following ON public.follows(following_id);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "follows_select_authenticated" ON public.follows;
CREATE POLICY "follows_select_authenticated"
  ON public.follows FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "follows_insert_own" ON public.follows;
CREATE POLICY "follows_insert_own"
  ON public.follows FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "follows_delete_own" ON public.follows;
CREATE POLICY "follows_delete_own"
  ON public.follows FOR DELETE TO authenticated
  USING (auth.uid() = follower_id);

GRANT SELECT, INSERT, DELETE ON public.follows TO authenticated;

-- ─── In-app értesítések ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_notifications_user_created
  ON public.app_notifications(user_id, created_at DESC);

ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_notifications_select_own" ON public.app_notifications;
CREATE POLICY "app_notifications_select_own"
  ON public.app_notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "app_notifications_update_own" ON public.app_notifications;
CREATE POLICY "app_notifications_update_own"
  ON public.app_notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, UPDATE ON public.app_notifications TO authenticated;

-- ─── Wallet: vásárlás levonás (available) ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.debit_wallet_available(p_user_id UUID, p_amount INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN true;
  END IF;

  INSERT INTO public.wallets (user_id) VALUES (p_user_id) ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.wallets
  SET available_balance = available_balance - p_amount, updated_at = NOW()
  WHERE user_id = p_user_id AND available_balance >= p_amount;

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.debit_wallet_available(UUID, INTEGER) TO service_role;

-- ─── Követők értesítése új termékről ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_followers_new_product()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seller_name TEXT;
BEGIN
  IF NEW.status IS DISTINCT FROM 'active' AND NEW.status IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(p.full_name, p.name, split_part(p.email, '@', 1), 'Eladó')
  INTO seller_name
  FROM public.profiles p
  WHERE p.id = NEW.user_id;

  INSERT INTO public.app_notifications (user_id, type, title, body, link)
  SELECT
    f.follower_id,
    'seller_new_item',
    seller_name || ' feltöltött egy új terméket!',
    NEW.name,
    '/products/' || NEW.id::text
  FROM public.follows f
  WHERE f.following_id = NEW.user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_followers_new_product ON public.products;
CREATE TRIGGER trg_notify_followers_new_product
  AFTER INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_followers_new_product();

-- ─── Realtime ─────────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.follows;
