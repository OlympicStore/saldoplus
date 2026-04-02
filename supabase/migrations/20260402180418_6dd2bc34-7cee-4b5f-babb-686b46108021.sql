
-- Fix profiles: users should not be able to self-update plan fields
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update own non-plan fields"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND plan = (SELECT p.plan FROM public.profiles p WHERE p.id = auth.uid())
  AND plan_started_at IS NOT DISTINCT FROM (SELECT p.plan_started_at FROM public.profiles p WHERE p.id = auth.uid())
  AND plan_expires_at IS NOT DISTINCT FROM (SELECT p.plan_expires_at FROM public.profiles p WHERE p.id = auth.uid())
);

-- Fix suggestions: make user_id NOT NULL
ALTER TABLE public.suggestions ALTER COLUMN user_id SET NOT NULL;

-- Fix suggestions SELECT policy to be more explicit
DROP POLICY IF EXISTS "Users can view own suggestions" ON public.suggestions;
CREATE POLICY "Users can view own suggestions"
ON public.suggestions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
