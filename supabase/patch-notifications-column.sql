-- app_notifications olvasottság — V1 frontend: is_read (kanonikus)
-- Futtasd, ha a tábla még read_at nélkül / is_read nélkül jött létre.

ALTER TABLE public.app_notifications
  ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT false;

-- Opcionális kompatibilitás (régi kód / audit)
ALTER TABLE public.app_notifications
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- Ha korábban read_at alapján jelölték olvasottnak, szinkronizálás
UPDATE public.app_notifications
SET is_read = true
WHERE read_at IS NOT NULL AND is_read = false;

CREATE INDEX IF NOT EXISTS idx_app_notifications_user_unread
  ON public.app_notifications(user_id)
  WHERE is_read = false;
