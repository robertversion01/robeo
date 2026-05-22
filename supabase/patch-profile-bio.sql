-- Publikus eladó bio (Vinted profil parity)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
