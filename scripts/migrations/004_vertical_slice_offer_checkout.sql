-- Vertical slice: offers checkout columns, category_slug, Stripe webhook idempotency, seller Connect id.
-- Apply after scripts/database.sql baseline.

BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT;

ALTER TABLE products ADD COLUMN IF NOT EXISTS category_slug TEXT NOT NULL DEFAULT 'other';

UPDATE products SET category_slug = COALESCE(NULLIF(BTRIM(category_slug), ''), 'other');

ALTER TABLE offers ADD COLUMN IF NOT EXISTS counter_price_huf INTEGER;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_stripe_checkout_session_id
  ON orders (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  stripe_event_id TEXT PRIMARY KEY,
  received_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_type TEXT,
  payload_json TEXT,
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  processed_at_utc TIMESTAMPTZ,
  error TEXT
);

COMMIT;
