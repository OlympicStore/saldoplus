-- Allow handle_new_user trigger to set the trial plan from signup metadata,
-- and allow the user to set their own trial plan during trial_active (one-time choice).

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _invite RECORD;
  _had_trial boolean;
  _trial_plan text;
BEGIN
  -- 1. Partner invite path (unchanged)
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

  -- Read trial plan choice from signup metadata (defaults to 'essencial')
  _trial_plan := COALESCE(NEW.raw_user_meta_data->>'trial_plan', 'essencial');
  IF _trial_plan NOT IN ('essencial', 'casa', 'pro') THEN
    _trial_plan := 'essencial';
  END IF;

  -- 2. Anti-abuse: repeat email
  SELECT EXISTS (
    SELECT 1 FROM public.trial_history WHERE email = NEW.email
  ) INTO _had_trial;

  IF _had_trial THEN
    INSERT INTO public.profiles (id, email, full_name, plan, account_status)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
      _trial_plan,
      'trial_expired'
    );
  ELSE
    -- 3. New email: 3-day trial on chosen plan
    INSERT INTO public.profiles (
      id, email, full_name, plan,
      trial_started_at, trial_ends_at, grace_period_ends_at,
      account_status
    )
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
      _trial_plan,
      now(),
      now() + interval '3 days',
      now() + interval '3 days' + interval '48 hours',
      'trial_active'
    );

    INSERT INTO public.trial_history (email)
    VALUES (NEW.email)
    ON CONFLICT (email) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- Allow users to switch their trial plan while trial is active (so they can experiment)
CREATE OR REPLACE FUNCTION public.check_profile_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- Allow plan change only when account is in trial_active and target is essencial/casa/pro
  IF NEW.plan IS DISTINCT FROM OLD.plan THEN
    IF OLD.account_status = 'trial_active'
       AND NEW.plan IN ('essencial', 'casa', 'pro')
       AND NEW.account_status = OLD.account_status THEN
      -- allowed
      NULL;
    ELSE
      RAISE EXCEPTION 'Cannot modify plan field';
    END IF;
  END IF;

  IF NEW.plan_started_at IS DISTINCT FROM OLD.plan_started_at
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