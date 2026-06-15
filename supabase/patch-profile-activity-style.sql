-- Profil aktivitás + opcionális termék meta (stílus, hibakép)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS style_tags TEXT[] DEFAULT '{}';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS defect_images TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_profiles_last_active ON public.profiles (last_active_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_style_tags ON public.products USING GIN (style_tags);
