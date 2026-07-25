-- Fix 1: attach check_profile_update trigger so users cannot modify plan/billing fields
DROP TRIGGER IF EXISTS profiles_check_update ON public.profiles;
CREATE TRIGGER profiles_check_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.check_profile_update();

-- Fix 2: ensure trial_history is only writable via privileged path (SECURITY DEFINER handle_new_user / service_role)
REVOKE INSERT, UPDATE, DELETE ON public.trial_history FROM anon, authenticated;

-- Explicit deny INSERT policy for authenticated/anon (defensive; RLS default-denies but this is explicit)
DROP POLICY IF EXISTS "No direct inserts to trial_history" ON public.trial_history;
CREATE POLICY "No direct inserts to trial_history"
ON public.trial_history
FOR INSERT
TO authenticated, anon
WITH CHECK (false);