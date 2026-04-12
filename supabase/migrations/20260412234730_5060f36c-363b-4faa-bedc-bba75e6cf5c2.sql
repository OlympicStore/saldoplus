ALTER TABLE public.partner_invites
  ADD COLUMN IF NOT EXISTS consultant_photo_position text DEFAULT 'center';