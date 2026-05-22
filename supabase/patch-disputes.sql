-- ROBEO — vitatás / refund (Vinted-szerű) — Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'under_review', 'resolved_refund', 'resolved_reject', 'cancelled')),
  admin_note TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT disputes_one_per_transaction UNIQUE (transaction_id)
);

CREATE INDEX IF NOT EXISTS idx_disputes_status_created
  ON public.disputes(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_disputes_reporter
  ON public.disputes(reporter_id);

ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "disputes_select_participant" ON public.disputes;
CREATE POLICY "disputes_select_participant"
  ON public.disputes FOR SELECT TO authenticated
  USING (
    reporter_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = transaction_id
        AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "disputes_insert_buyer" ON public.disputes;
CREATE POLICY "disputes_insert_buyer"
  ON public.disputes FOR INSERT TO authenticated
  WITH CHECK (
    reporter_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = transaction_id AND t.buyer_id = auth.uid()
    )
  );

GRANT SELECT, INSERT ON public.disputes TO authenticated;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS dispute_status TEXT;

CREATE INDEX IF NOT EXISTS idx_transactions_dispute_status
  ON public.transactions(dispute_status)
  WHERE dispute_status IS NOT NULL;
