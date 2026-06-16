-- Observability: analytics funnel + client error logok + in-app feedback
-- Lokalis, ingyenes (sajat Supabase) — nincs kulso analytics/monitoring szolgaltatas.
-- Az inserteket a szerveroldali service-role kliens vegzi (API route-ok),
-- ezert RLS be van kapcsolva policy nelkul: anon/authenticated NEM fer hozza kozvetlenul.
-- Futtatas: Supabase SQL Editor -> majd NOTIFY pgrst, 'reload schema';

-- 1) Analytics esemenyek (anonim, session-alapu funnel)
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  name TEXT NOT NULL,
  props JSONB NOT NULL DEFAULT '{}'::jsonb,
  path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_name_time
  ON public.analytics_events(name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session
  ON public.analytics_events(session_id);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- 2) Kliens oldali hibanaplo (error monitoring)
CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  stack TEXT,
  source TEXT,
  path TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_error_logs_time
  ON public.error_logs(created_at DESC);

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- 3) In-app feedback / hibajelentes
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'other'
    CHECK (type IN ('bug', 'idea', 'praise', 'other')),
  message TEXT NOT NULL,
  path TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_time
  ON public.feedback(created_at DESC);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
