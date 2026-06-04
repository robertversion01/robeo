-- Pickup point oszlopok — semleges nevek (Foxpost + Packeta közös)
-- A régi foxpost_terminal_* oszlopok megmaradnak (backward compat),
-- de új generic oszlopokat is használunk: pickup_point_*.
-- A backfill másolja a meglévő foxpost_terminal_* értékeket.

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS pickup_point_id TEXT,
  ADD COLUMN IF NOT EXISTS pickup_point_name TEXT,
  ADD COLUMN IF NOT EXISTS pickup_point_address TEXT,
  ADD COLUMN IF NOT EXISTS pickup_provider TEXT;

-- Backfill: ha még üres, másoljuk a foxpost_terminal_* értékeket
UPDATE public.transactions
SET
  pickup_point_id = COALESCE(pickup_point_id, foxpost_terminal_id),
  pickup_point_name = COALESCE(pickup_point_name, foxpost_terminal_name),
  pickup_point_address = COALESCE(pickup_point_address, foxpost_terminal_address),
  pickup_provider = COALESCE(
    pickup_provider,
    CASE
      WHEN shipping_method = 'packeta' THEN 'packeta'
      WHEN shipping_method = 'foxpost' THEN 'foxpost'
      WHEN foxpost_terminal_id IS NOT NULL THEN 'foxpost'
      ELSE NULL
    END
  )
WHERE foxpost_terminal_id IS NOT NULL
   OR foxpost_terminal_name IS NOT NULL
   OR foxpost_terminal_address IS NOT NULL;

COMMENT ON COLUMN public.transactions.pickup_point_id IS 'Foxpost automata operator_id VAGY Packeta point id';
COMMENT ON COLUMN public.transactions.pickup_point_name IS 'Atvevohely megjelenitett neve';
COMMENT ON COLUMN public.transactions.pickup_point_address IS 'Atvevohely cime';
COMMENT ON COLUMN public.transactions.pickup_provider IS 'foxpost | packeta';
COMMENT ON COLUMN public.transactions.foxpost_terminal_id IS 'DEPRECATED — hasznald pickup_point_id-t (backward compat)';
COMMENT ON COLUMN public.transactions.foxpost_terminal_name IS 'DEPRECATED — hasznald pickup_point_name-t (backward compat)';
COMMENT ON COLUMN public.transactions.foxpost_terminal_address IS 'DEPRECATED — hasznald pickup_point_address-t (backward compat)';

CREATE INDEX IF NOT EXISTS idx_transactions_pickup_provider
  ON public.transactions(pickup_provider) WHERE pickup_provider IS NOT NULL;

NOTIFY pgrst, 'reload schema';
