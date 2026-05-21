-- Bundle Checkout v2 line items + Promote analytics (demo)
-- Futtatás: Supabase SQL Editor

-- ─── 1. Csomag rendelés tételek ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transaction_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL,
  unit_price_huf INTEGER NOT NULL CHECK (unit_price_huf >= 0),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transaction_line_items_tx
  ON public.transaction_line_items(transaction_id, sort_order);

ALTER TABLE public.transaction_line_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "line_items_select_parties" ON public.transaction_line_items;
CREATE POLICY "line_items_select_parties"
  ON public.transaction_line_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = transaction_id
        AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid())
    )
  );

GRANT SELECT ON public.transaction_line_items TO authenticated;

-- ─── 2. Kiemelés demo statisztika (termékenként) ──────────────────────────────
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS promote_demo_views INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS promote_demo_clicks INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS promote_last_boosted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_products_featured_active
  ON public.products(user_id, featured_until)
  WHERE featured_until IS NOT NULL;

NOTIFY pgrst, 'reload schema';
