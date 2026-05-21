-- Szabadság üzemmód (Vinted-style vacation) — eladó hirdetései rejtve a fő feedből
-- Futtatás: Supabase SQL Editor

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS vacation_mode BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_vacation_mode
  ON public.profiles(vacation_mode)
  WHERE vacation_mode = true;

NOTIFY pgrst, 'reload schema';
