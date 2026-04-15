
-- Add consultant to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'consultant';

-- Create partner_consultants table
CREATE TABLE public.partner_consultants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT NOT NULL,
  photo_url TEXT,
  photo_position TEXT DEFAULT 'center',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_consultants ENABLE ROW LEVEL SECURITY;

-- Consultants can view their own record
CREATE POLICY "Consultants can view own record"
ON public.partner_consultants FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Partners can view consultants of their partner
CREATE POLICY "Partners can view own consultants"
ON public.partner_consultants FOR SELECT
TO authenticated
USING (partner_id = get_my_partner_id());

-- Partners can insert consultants for their partner
CREATE POLICY "Partners can insert own consultants"
ON public.partner_consultants FOR INSERT
TO authenticated
WITH CHECK (partner_id = get_my_partner_id());

-- Partners can update consultants of their partner
CREATE POLICY "Partners can update own consultants"
ON public.partner_consultants FOR UPDATE
TO authenticated
USING (partner_id = get_my_partner_id())
WITH CHECK (partner_id = get_my_partner_id());

-- Admins can manage all consultants
CREATE POLICY "Admins can manage consultants"
ON public.partner_consultants FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Add consultant_id to partner_invites
ALTER TABLE public.partner_invites ADD COLUMN consultant_id UUID REFERENCES public.partner_consultants(id);

-- Consultants can view invites assigned to them
CREATE POLICY "Consultants can view own invites"
ON public.partner_invites FOR SELECT
TO authenticated
USING (consultant_id IN (SELECT id FROM public.partner_consultants WHERE user_id = auth.uid()));

-- Consultants can view profiles of their clients
CREATE POLICY "Consultants can view client profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  partner_id IS NOT NULL
  AND id IN (
    SELECT p.id FROM public.profiles p
    JOIN public.partner_invites pi ON pi.email = p.email AND pi.status = 'accepted'
    JOIN public.partner_consultants pc ON pc.id = pi.consultant_id
    WHERE pc.user_id = auth.uid()
  )
);

-- Consultants can view house_data of their clients
CREATE POLICY "Consultants can view client house_data"
ON public.house_data FOR SELECT
TO authenticated
USING (
  user_id IN (
    SELECT p.id FROM public.profiles p
    JOIN public.partner_invites pi ON pi.email = p.email AND pi.status = 'accepted'
    JOIN public.partner_consultants pc ON pc.id = pi.consultant_id
    WHERE pc.user_id = auth.uid()
  )
);

-- Helper function to get consultant's partner_id
CREATE OR REPLACE FUNCTION public.get_consultant_partner_id()
RETURNS UUID
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT partner_id FROM public.partner_consultants WHERE user_id = auth.uid() AND active = true LIMIT 1
$$;

-- Trigger for updated_at
CREATE TRIGGER update_partner_consultants_updated_at
BEFORE UPDATE ON public.partner_consultants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
