DROP VIEW IF EXISTS public.groups_safe;
CREATE VIEW public.groups_safe WITH (security_invoker = true) AS
SELECT
  id, name, owner_id, created_at,
  CASE WHEN owner_id = auth.uid() THEN invite_code ELSE NULL END AS invite_code
FROM public.groups;