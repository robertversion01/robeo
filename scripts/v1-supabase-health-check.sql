-- ROBEO v1 — Supabase éles ellenőrző (SQL Editorban futtasd a projektben).
-- Cél: a TODO-TOMORROW kritikus flow-hoz szükséges oszlopok/táblák megvannak-e.

-- 1) products — többkép + meta
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'products'
  AND column_name IN ('images', 'image_url', 'status', 'condition', 'brand', 'featured_until')
ORDER BY column_name;

-- 2) offers — ajánlat + szállítás + státusz
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'offers'
  AND column_name IN ('status', 'offered_price', 'shipping_method', 'shipping_cost', 'message')
ORDER BY column_name;

-- 3) transactions — checkout / stripe
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'transactions'
  AND column_name IN (
    'checkout_session_id',
    'payment_intent_id',
    'fee',
    'shipping_method',
    'shipping_cost',
    'status'
  )
ORDER BY column_name;

-- 4) stripe webhook idempotencia tábla (ha migration lefutott)
SELECT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'stripe_webhook_events'
) AS has_stripe_webhook_events;

-- 5) profiles trigger (új user)
SELECT EXISTS (
  SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
) AS has_profile_trigger;
