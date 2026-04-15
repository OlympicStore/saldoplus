-- Drop the problematic recursive policies
DROP POLICY IF EXISTS "Consultants can view client profiles" ON public.profiles;
DROP POLICY IF EXISTS "Consultants can view client house_data" ON public.house_data;

-- Create a security definer function to get client IDs for a consultant
CREATE OR REPLACE FUNCTION public.get_consultant_client_ids(_consultant_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id
  FROM profiles p
  JOIN partner_invites pi ON pi.email = p.email AND pi.status = 'accepted'
  JOIN partner_consultants pc ON pc.id = pi.consultant_id
  WHERE pc.user_id = _consultant_user_id
$$;

-- Recreate consultant profile view policy using the function
CREATE POLICY "Consultants can view client profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  id IN (SELECT get_consultant_client_ids(auth.uid()))
);

-- Recreate consultant house_data view policy using the function
CREATE POLICY "Consultants can view client house_data"
ON public.house_data FOR SELECT
TO authenticated
USING (
  user_id IN (SELECT get_consultant_client_ids(auth.uid()))
);

-- Also allow consultants to view partner record for branding
CREATE POLICY "Consultants can view own partner"
ON public.partners FOR SELECT
TO authenticated
USING (
  id = (SELECT get_consultant_partner_id())
);