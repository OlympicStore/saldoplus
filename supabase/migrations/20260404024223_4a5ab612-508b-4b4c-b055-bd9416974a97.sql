
-- Fix 1: Remove the overly permissive INSERT policy on group_members
DROP POLICY IF EXISTS "Users can join group with invite code" ON public.group_members;

-- Create a secure function to join a group with invite code validation
CREATE OR REPLACE FUNCTION public.join_group_with_invite(_group_id uuid, _invite_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate invite code
  IF NOT public.verify_invite_code(_group_id, _invite_code) THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  -- Check if already a member
  IF EXISTS (SELECT 1 FROM public.group_members WHERE group_id = _group_id AND user_id = auth.uid()) THEN
    RETURN true; -- Already a member
  END IF;

  -- Insert the member
  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (_group_id, auth.uid(), 'member');

  RETURN true;
END;
$$;
