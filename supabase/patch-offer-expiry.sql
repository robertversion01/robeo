-- Ajánlat 24h lejárat (Vinted parity)
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_offers_expires_at
  ON public.offers (expires_at)
  WHERE status IN ('pending', 'countered');

-- Meglévő nyitott ajánlatok: 24h a létrehozástól
UPDATE public.offers
SET expires_at = created_at + INTERVAL '24 hours'
WHERE expires_at IS NULL
  AND status IN ('pending', 'countered');
