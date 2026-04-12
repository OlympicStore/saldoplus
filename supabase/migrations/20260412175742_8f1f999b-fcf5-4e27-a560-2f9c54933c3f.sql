
-- Add branding columns to partners
ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS brand_color text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS brand_logo_url text DEFAULT NULL;

-- Create storage bucket for partner logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('partner-logos', 'partner-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access for logos
CREATE POLICY "Anyone can view partner logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'partner-logos');

-- Admins can upload logos
CREATE POLICY "Admins can upload partner logos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'partner-logos' AND public.has_role(auth.uid(), 'admin'));

-- Admins can update logos
CREATE POLICY "Admins can update partner logos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'partner-logos' AND public.has_role(auth.uid(), 'admin'));

-- Admins can delete logos
CREATE POLICY "Admins can delete partner logos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'partner-logos' AND public.has_role(auth.uid(), 'admin'));
