-- 1. Add trial fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS grace_period_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS data_deleted_at timestamptz;

-- Add check constraint for valid statuses
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_account_status_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_account_status_check
  CHECK (account_status IN ('trial_active', 'active', 'trial_expired', 'data_deleted'));

-- Index for cron queries
CREATE INDEX IF NOT EXISTS idx_profiles_trial_ends_at ON public.profiles(trial_ends_at) WHERE account_status = 'trial_active';
CREATE INDEX IF NOT EXISTS idx_profiles_grace_period_ends_at ON public.profiles(grace_period_ends_at) WHERE account_status = 'trial_expired';

-- 2. Track which emails have already used a trial (anti-abuse, persists after profile soft-delete)
CREATE TABLE IF NOT EXISTS public.trial_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  first_trial_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trial_history ENABLE ROW LEVEL SECURITY;

-- Only admins can read/manage trial_history (used internally by triggers)
CREATE POLICY "Admins can view trial_history"
  ON public.trial_history FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. Update handle_new_user to assign trial OR detect repeat email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _invite RECORD;
  _had_trial boolean;
BEGIN
  -- 1. Check if user was invited by a partner (no trial, gets imobiliaria plan)
  SELECT pi.id, pi.partner_id, pi.expires_at
  INTO _invite
  FROM public.partner_invites pi
  WHERE pi.email = NEW.email
    AND pi.status = 'pending'
    AND (pi.expires_at IS NULL OR pi.expires_at > now())
  ORDER BY pi.created_at DESC
  LIMIT 1;

  IF _invite.id IS NOT NULL THEN
    INSERT INTO public.profiles (
      id, email, full_name, plan, plan_source, partner_id,
      plan_started_at, plan_expires_at, account_status
    )
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
      'imobiliaria',
      'partner',
      _invite.partner_id,
      now(),
      now() + interval '1 year',
      'active'
    );
    UPDATE public.partner_invites SET status = 'accepted' WHERE id = _invite.id;
    RETURN NEW;
  END IF;

  -- 2. Check if this email already had a trial before (anti-abuse)
  SELECT EXISTS (
    SELECT 1 FROM public.trial_history WHERE email = NEW.email
  ) INTO _had_trial;

  IF _had_trial THEN
    -- Repeat email: no trial, must subscribe
    INSERT INTO public.profiles (id, email, full_name, account_status)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
      'trial_expired'
    );
  ELSE
    -- 3. Brand new email: grant 3-day trial
    INSERT INTO public.profiles (
      id, email, full_name,
      trial_started_at, trial_ends_at, grace_period_ends_at,
      account_status
    )
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
      now(),
      now() + interval '3 days',
      now() + interval '3 days' + interval '48 hours',
      'trial_active'
    );

    -- Record trial usage to prevent reuse
    INSERT INTO public.trial_history (email)
    VALUES (NEW.email)
    ON CONFLICT (email) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- 4. Update check_profile_update to allow service role to change new fields
CREATE OR REPLACE FUNCTION public.check_profile_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Service role bypasses checks
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Admins can change anything
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- Regular users cannot modify plan/trial fields
  IF NEW.plan IS DISTINCT FROM OLD.plan
     OR NEW.plan_started_at IS DISTINCT FROM OLD.plan_started_at
     OR NEW.plan_expires_at IS DISTINCT FROM OLD.plan_expires_at
     OR NEW.partner_id IS DISTINCT FROM OLD.partner_id
     OR NEW.plan_source IS DISTINCT FROM OLD.plan_source
     OR NEW.trial_started_at IS DISTINCT FROM OLD.trial_started_at
     OR NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at
     OR NEW.grace_period_ends_at IS DISTINCT FROM OLD.grace_period_ends_at
     OR NEW.account_status IS DISTINCT FROM OLD.account_status
     OR NEW.data_deleted_at IS DISTINCT FROM OLD.data_deleted_at THEN
    RAISE EXCEPTION 'Cannot modify plan/trial fields';
  END IF;

  RETURN NEW;
END;
$function$;

-- Make sure the trigger is attached
DROP TRIGGER IF EXISTS check_profile_update_trigger ON public.profiles;
CREATE TRIGGER check_profile_update_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_profile_update();

-- Make sure handle_new_user trigger is attached to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 5. Migrate existing profiles to 'active' (they keep what they have, no trial applied)
UPDATE public.profiles
SET account_status = 'active'
WHERE account_status = 'active' AND trial_started_at IS NULL;

-- 6. Soft-delete function: marks user data as deleted without removing rows
-- Triggered by the expire-trials cron after grace_period ends
CREATE OR REPLACE FUNCTION public.soft_delete_user_data(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Mark profile as data_deleted
  UPDATE public.profiles
  SET account_status = 'data_deleted',
      data_deleted_at = now()
  WHERE id = _user_id;
  -- Note: actual financial data (incomes, expenses, etc.) is preserved.
  -- The app filters/blocks access based on account_status='data_deleted'.
  -- If user re-subscribes within reasonable time, status flips back to 'active' and data is visible again.
END;
$function$;

-- 7. Restore function: when user subscribes after trial_expired or data_deleted
CREATE OR REPLACE FUNCTION public.restore_user_after_subscription(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.profiles
  SET account_status = 'active',
      data_deleted_at = NULL,
      grace_period_ends_at = NULL
  WHERE id = _user_id;
END;
$function$;