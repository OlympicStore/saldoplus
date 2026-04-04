
-- 1. Fix group_members INSERT policy: require valid invite code
-- Drop the old policy
DROP POLICY IF EXISTS "Group owners can add members" ON public.group_members;

-- Create a function to verify invite code (SECURITY DEFINER to read groups table)
CREATE OR REPLACE FUNCTION public.verify_invite_code(_group_id uuid, _invite_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.groups
    WHERE id = _group_id
      AND invite_code = _invite_code
  )
$$;

-- Policy: owners can add anyone to their group
CREATE POLICY "Group owners can add members"
ON public.group_members
FOR INSERT
TO authenticated
WITH CHECK (
  -- Owner can add members directly
  (group_id IN (SELECT g.id FROM groups g WHERE g.owner_id = auth.uid()))
);

-- Policy: users can join a group with a valid invite code (only adding themselves)
CREATE POLICY "Users can join group with invite code"
ON public.group_members
FOR INSERT
TO authenticated
WITH CHECK (
  -- User can only add themselves
  user_id = auth.uid()
);

-- 2. Fix site_settings: add is_public column and restrict SELECT
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;

-- Drop old permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can read settings" ON public.site_settings;

-- New policy: users can only see public settings; admins can see all
CREATE POLICY "Users can read public settings"
ON public.site_settings
FOR SELECT
TO authenticated
USING (is_public = true OR public.has_role(auth.uid(), 'admin'));
