-- Admin role oszlop — RBAC (profiles.role === 'admin')
-- Futtasd a Supabase SQL Editorban, majd: NOTIFY pgrst, 'reload schema';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('user', 'admin', 'moderator'));

COMMENT ON COLUMN public.profiles.role IS 'RBAC: user | admin | moderator';

-- Első admin (cseréld a saját user UUID-re, ha más az ID):
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'hevesi.tr@gmail.com';
-- Vagy auth metadata: UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || '{"role":"admin"}' WHERE email = '...';

NOTIFY pgrst, 'reload schema';
