-- ROBEO C2C Marketplace - PostgreSQL initialization script
-- This script is intentionally not executed by the agent.

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_status') THEN
    CREATE TYPE product_status AS ENUM ('available', 'sold', 'deleted');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_condition') THEN
    CREATE TYPE product_condition AS ENUM ('new_with_tags', 'very_good', 'good', 'satisfactory');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    CREATE TYPE order_status AS ENUM (
      'created',
      'payment_pending',
      'funds_in_escrow',
      'shipped',
      'delivered',
      'completed',
      'cancelled',
      'refunded'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  phone_number TEXT,
  city TEXT,
  country_code CHAR(2) NOT NULL DEFAULT 'HU',
  rating_average NUMERIC(3,2) NOT NULL DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  avatar_url TEXT,
  stripe_connect_account_id TEXT,
  created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  postal_code TEXT NOT NULL,
  city TEXT NOT NULL,
  street_address TEXT,
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  is_primary BOOLEAN NOT NULL DEFAULT TRUE,
  created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  parent_category_id UUID REFERENCES product_categories(id),
  created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID NOT NULL REFERENCES users(id),
  category_id UUID REFERENCES product_categories(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  brand TEXT,
  size TEXT,
  condition product_condition NOT NULL,
  price_huf INTEGER NOT NULL CHECK (price_huf > 0),
  status product_status NOT NULL DEFAULT 'available',
  currency_code CHAR(3) NOT NULL DEFAULT 'HUF',
  shipping_from_city TEXT,
  category_slug TEXT NOT NULL DEFAULT 'other',
  featured_until_utc TIMESTAMPTZ,
  view_count INTEGER NOT NULL DEFAULT 0,
  favorite_count INTEGER NOT NULL DEFAULT 0,
  created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  buyer_user_id UUID NOT NULL REFERENCES users(id),
  seller_user_id UUID NOT NULL REFERENCES users(id),
  offered_price_huf INTEGER NOT NULL CHECK (offered_price_huf > 0),
  status TEXT NOT NULL DEFAULT 'pending',
  buyer_message TEXT,
  seller_counter_message TEXT,
  counter_price_huf INTEGER,
  created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id),
  buyer_user_id UUID NOT NULL REFERENCES users(id),
  seller_user_id UUID NOT NULL REFERENCES users(id),
  offer_id UUID REFERENCES offers(id),
  status order_status NOT NULL DEFAULT 'created',
  item_price_huf INTEGER NOT NULL CHECK (item_price_huf > 0),
  shipping_fee_huf INTEGER NOT NULL DEFAULT 0,
  platform_fee_huf INTEGER NOT NULL DEFAULT 0,
  vat_rate_percent INTEGER NOT NULL DEFAULT 27 CHECK (vat_rate_percent >= 0),
  vat_amount_huf INTEGER NOT NULL DEFAULT 0,
  total_amount_huf INTEGER GENERATED ALWAYS AS (item_price_huf + shipping_fee_huf + platform_fee_huf) STORED,
  currency_code CHAR(3) NOT NULL DEFAULT 'HUF',
  escrow_provider TEXT NOT NULL DEFAULT 'stripe_connect',
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  stripe_transfer_group TEXT,
  foxpost_locker_code TEXT,
  foxpost_label_reference TEXT,
  created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_user_id UUID NOT NULL REFERENCES users(id),
  seller_user_id UUID NOT NULL REFERENCES users(id),
  product_id UUID REFERENCES products(id),
  order_id UUID REFERENCES orders(id),
  last_message_at_utc TIMESTAMPTZ,
  created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL REFERENCES users(id),
  receiver_user_id UUID NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  media_url TEXT,
  sent_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_read BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL, -- charge / transfer / refund / fee
  amount_huf INTEGER NOT NULL,
  currency_code CHAR(3) NOT NULL DEFAULT 'HUF',
  provider_reference TEXT,
  status TEXT NOT NULL DEFAULT 'created',
  created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shipment_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_description TEXT,
  external_reference TEXT,
  created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- billingo / szamlazz_hu
  external_invoice_id TEXT,
  gross_amount_huf INTEGER NOT NULL,
  vat_rate_percent INTEGER NOT NULL DEFAULT 27,
  status TEXT NOT NULL DEFAULT 'draft',
  issued_at_utc TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id),
  product_id UUID REFERENCES products(id),
  reviewer_user_id UUID NOT NULL REFERENCES users(id),
  reviewed_user_id UUID NOT NULL REFERENCES users(id),
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (order_id, reviewer_user_id)
);

CREATE INDEX IF NOT EXISTS idx_products_status_price ON products(status, price_huf);
CREATE INDEX IF NOT EXISTS idx_products_featured_until ON products(featured_until_utc DESC) WHERE featured_until_utc IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_popular ON products(status, view_count DESC, favorite_count DESC);
CREATE INDEX IF NOT EXISTS idx_products_brand_size ON products(brand, size);

CREATE UNIQUE INDEX IF NOT EXISTS ux_conversations_listing_thread
  ON conversations (buyer_user_id, seller_user_id, product_id)
  WHERE order_id IS NULL AND product_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_conversations_order_thread
  ON conversations (order_id)
  WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at_utc DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_time ON messages(conversation_id, sent_at_utc DESC);
CREATE INDEX IF NOT EXISTS idx_offers_product_status ON offers(product_id, status);

CREATE OR REPLACE FUNCTION set_updated_at_utc()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at_utc = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at_utc();

DROP TRIGGER IF EXISTS trg_products_updated_at ON products;
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION set_updated_at_utc();

DROP TRIGGER IF EXISTS trg_offers_updated_at ON offers;
CREATE TRIGGER trg_offers_updated_at BEFORE UPDATE ON offers
FOR EACH ROW EXECUTE FUNCTION set_updated_at_utc();

DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION set_updated_at_utc();

CREATE OR REPLACE FUNCTION enforce_order_state_machine()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status = NEW.status THEN
      RETURN NEW;
    END IF;

    IF NOT (
      (OLD.status = 'created' AND NEW.status IN ('payment_pending', 'cancelled')) OR
      (OLD.status = 'payment_pending' AND NEW.status IN ('funds_in_escrow', 'cancelled')) OR
      (OLD.status = 'funds_in_escrow' AND NEW.status IN ('shipped', 'refunded')) OR
      (OLD.status = 'shipped' AND NEW.status IN ('delivered', 'refunded')) OR
      (OLD.status = 'delivered' AND NEW.status IN ('completed', 'refunded')) OR
      (OLD.status = 'completed' AND NEW.status = 'refunded')
    ) THEN
      RAISE EXCEPTION 'Invalid order status transition: % -> %', OLD.status, NEW.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_order_state_machine ON orders;
CREATE TRIGGER trg_enforce_order_state_machine
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION enforce_order_state_machine();

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_stripe_checkout_session_id
  ON orders (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_orders_open_offer_checkout
  ON orders (offer_id)
  WHERE offer_id IS NOT NULL AND status IN ('created', 'payment_pending');

CREATE UNIQUE INDEX IF NOT EXISTS ux_orders_open_buynow_checkout
  ON orders (product_id, buyer_user_id)
  WHERE offer_id IS NULL AND status IN ('created', 'payment_pending');

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
