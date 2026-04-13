
-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Partners can view client profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own non-plan fields" ON public.profiles;

-- Recreate partner view policy using a security definer function instead of subquery
CREATE OR REPLACE FUNCTION public.get_my_partner_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT partner_id FROM public.profiles WHERE id = auth.uid()
$$;

-- Partners can view profiles of users in their agency
CREATE POLICY "Partners can view client profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  partner_id IS NOT NULL
  AND partner_id = public.get_my_partner_id()
);

-- Users can update their own profile (non-plan fields only)
CREATE OR REPLACE FUNCTION public.check_profile_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If admin, allow all changes
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- For regular users, prevent changing plan-related fields
  IF NEW.plan IS DISTINCT FROM OLD.plan
     OR NEW.plan_started_at IS DISTINCT FROM OLD.plan_started_at
     OR NEW.plan_expires_at IS DISTINCT FROM OLD.plan_expires_at
     OR NEW.partner_id IS DISTINCT FROM OLD.partner_id
     OR NEW.plan_source IS DISTINCT FROM OLD.plan_source THEN
    RAISE EXCEPTION 'Cannot modify plan fields';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_profile_update_trigger ON public.profiles;
CREATE TRIGGER check_profile_update_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_profile_update();

-- Simple update policy: users can update their own row
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
