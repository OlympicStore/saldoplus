CREATE TABLE public.site_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read settings (needed for pricing page)
CREATE POLICY "Authenticated users can read settings"
ON public.site_settings FOR SELECT TO authenticated
USING (true);

-- Only admins can modify settings
CREATE POLICY "Admins can insert settings"
ON public.site_settings FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update settings"
ON public.site_settings FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete settings"
ON public.site_settings FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Seed default empty payment link entries
INSERT INTO public.site_settings (key, value) VALUES
  ('payment_link_essencial', ''),
  ('payment_link_casa', ''),
  ('payment_link_pro', '');

CREATE TRIGGER update_site_settings_updated_at
BEFORE UPDATE ON public.site_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();