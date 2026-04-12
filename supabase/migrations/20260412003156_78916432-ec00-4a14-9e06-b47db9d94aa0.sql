
-- Allow users to see their own partner
CREATE POLICY "Users can view own partner"
  ON public.partners FOR SELECT TO authenticated
  USING (id = (SELECT p.partner_id FROM public.profiles p WHERE p.id = auth.uid()));

-- Enable extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
