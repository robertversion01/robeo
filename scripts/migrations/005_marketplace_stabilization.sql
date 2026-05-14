-- Stabilization: checkout dedupe, featured/popular columns, chat/order threads, notifications, review.product_id.
-- Apply after database.sql / 004 migration.

BEGIN;

ALTER TABLE offers ADD COLUMN IF NOT EXISTS counter_price_huf INTEGER;

ALTER TABLE products ADD COLUMN IF NOT EXISTS featured_until_utc TIMESTAMPTZ;
ALTER TABLE products ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS favorite_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id);

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id);

ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_buyer_user_id_seller_user_id_product_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS ux_conversations_listing_thread
  ON conversations (buyer_user_id, seller_user_id, product_id)
  WHERE order_id IS NULL AND product_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_conversations_order_thread
  ON conversations (order_id)
  WHERE order_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  offer_id UUID REFERENCES offers(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  read_at_utc TIMESTAMPTZ,
  created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at_utc DESC);

CREATE INDEX IF NOT EXISTS idx_products_featured_until ON products(featured_until_utc DESC) WHERE featured_until_utc IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_popular ON products(status, view_count DESC, favorite_count DESC);

CREATE UNIQUE INDEX IF NOT EXISTS ux_orders_open_offer_checkout
  ON orders (offer_id)
  WHERE offer_id IS NOT NULL AND status IN ('created', 'payment_pending');

CREATE UNIQUE INDEX IF NOT EXISTS ux_orders_open_buynow_checkout
  ON orders (product_id, buyer_user_id)
  WHERE offer_id IS NULL AND status IN ('created', 'payment_pending');

COMMIT;
