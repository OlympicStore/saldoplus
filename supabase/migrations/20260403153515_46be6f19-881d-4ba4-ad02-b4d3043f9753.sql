-- Fix: prevent users from adding themselves to any group
DROP POLICY IF EXISTS "Group owners can add members" ON public.group_members;
CREATE POLICY "Group owners can add members" ON public.group_members
FOR INSERT TO authenticated
WITH CHECK (
  group_id IN (SELECT g.id FROM public.groups g WHERE g.owner_id = auth.uid())
);

-- Fix: create a view that hides invite_code from non-owners
CREATE OR REPLACE VIEW public.groups_safe AS
SELECT
  id, name, owner_id, created_at,
  CASE WHEN owner_id = auth.uid() THEN invite_code ELSE NULL END AS invite_code
FROM public.groups;