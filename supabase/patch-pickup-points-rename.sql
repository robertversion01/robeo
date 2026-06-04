-- Pickup point oszlopok — semleges nevek (Foxpost + Packeta közös)
-- Új generic oszlopok: pickup_point_*.
-- Ha létezik a régi foxpost_terminal_* (patch-vinted-masterpiece.sql lefutott),
-- akkor backfill-eljük az értékeket és deprecated COMMENT-eket teszünk rájuk.

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS pickup_point_id TEXT,
  ADD COLUMN IF NOT EXISTS pickup_point_name TEXT,
  ADD COLUMN IF NOT EXISTS pickup_point_address TEXT,
  ADD COLUMN IF NOT EXISTS pickup_provider TEXT;

-- Backfill csak akkor, ha a régi oszlopok valóban léteznek.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'transactions'
      AND column_name  = 'foxpost_terminal_id'
  ) THEN
    EXECUTE $upd$
      UPDATE public.transactions
      SET
        pickup_point_id      = COALESCE(pickup_point_id,      foxpost_terminal_id),
        pickup_point_name    = COALESCE(pickup_point_name,    foxpost_terminal_name),
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
      WHERE foxpost_terminal_id      IS NOT NULL
         OR foxpost_terminal_name    IS NOT NULL
         OR foxpost_terminal_address IS NOT NULL
    $upd$;

    -- Deprecated COMMENT-ek csak akkor, ha az oszlop tényleg létezik.
    EXECUTE $c$ COMMENT ON COLUMN public.transactions.foxpost_terminal_id      IS 'DEPRECATED — hasznald pickup_point_id-t (backward compat)' $c$;
    EXECUTE $c$ COMMENT ON COLUMN public.transactions.foxpost_terminal_name    IS 'DEPRECATED — hasznald pickup_point_name-t (backward compat)' $c$;
    EXECUTE $c$ COMMENT ON COLUMN public.transactions.foxpost_terminal_address IS 'DEPRECATED — hasznald pickup_point_address-t (backward compat)' $c$;
  END IF;
END
$$;

-- Új oszlopokra mindig megy a COMMENT.
COMMENT ON COLUMN public.transactions.pickup_point_id      IS 'Foxpost automata operator_id VAGY Packeta point id';
COMMENT ON COLUMN public.transactions.pickup_point_name    IS 'Atvevohely megjelenitett neve';
COMMENT ON COLUMN public.transactions.pickup_point_address IS 'Atvevohely cime';
COMMENT ON COLUMN public.transactions.pickup_provider      IS 'foxpost | packeta';

CREATE INDEX IF NOT EXISTS idx_transactions_pickup_provider
  ON public.transactions(pickup_provider) WHERE pickup_provider IS NOT NULL;

NOTIFY pgrst, 'reload schema';
