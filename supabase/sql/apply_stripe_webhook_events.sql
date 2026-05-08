-- =============================================================================
-- ROBEO — stripe_webhook_events tábla egyszeri / biztonságos alkalmazása
-- Hely: Supabase Dashboard → SQL Editor → illeszd be az EGÉSZ fájlt → Run
-- Idempotens: többször futtatható (hiba nélkül), kezeli a régi id oszlopot is.
-- Séma: stripe_event_id, received_at, event_type, payload, processed, processed_at, error
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  stripe_event_id TEXT PRIMARY KEY,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_type TEXT,
  payload JSONB,
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  error TEXT
);

ALTER TABLE public.stripe_webhook_events ADD COLUMN IF NOT EXISTS event_type TEXT;
ALTER TABLE public.stripe_webhook_events ADD COLUMN IF NOT EXISTS payload JSONB;
ALTER TABLE public.stripe_webhook_events ADD COLUMN IF NOT EXISTS processed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.stripe_webhook_events ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;
ALTER TABLE public.stripe_webhook_events ADD COLUMN IF NOT EXISTS error TEXT;

-- Ritka: egyszerre id ÉS stripe_event_id (félbemaradt migráció)
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

-- Régi séma: csak id oszlop
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

REVOKE ALL ON TABLE public.stripe_webhook_events FROM anon;
REVOKE ALL ON TABLE public.stripe_webhook_events FROM authenticated;

COMMENT ON TABLE public.stripe_webhook_events IS 'Stripe evt_* — service_role; payload audit; processed + processed_at.';
COMMENT ON COLUMN public.stripe_webhook_events.payload IS 'Stripe Event JSON (audit).';
COMMENT ON COLUMN public.stripe_webhook_events.processed IS 'true ha a handler lefutott hiba nélkül.';
COMMENT ON COLUMN public.stripe_webhook_events.error IS 'Feldolgozási hiba szöveg (HTTP válasz mindig 200).';
