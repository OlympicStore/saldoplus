ALTER TABLE public.partner_invites
  ADD COLUMN IF NOT EXISTS consultant_name text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS consultant_phone text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS consultant_email text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS consultant_photo_url text DEFAULT NULL;