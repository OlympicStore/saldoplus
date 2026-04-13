-- Add status column to suggestions
ALTER TABLE public.suggestions ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pendente';

-- Allow admins to update suggestions
CREATE POLICY "Admins can update suggestions"
  ON public.suggestions FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete suggestions
CREATE POLICY "Admins can delete suggestions"
  ON public.suggestions FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add partner role to app_role enum (will be usable in next migration)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'partner';