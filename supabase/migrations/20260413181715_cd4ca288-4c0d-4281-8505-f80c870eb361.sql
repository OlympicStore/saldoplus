
CREATE OR REPLACE FUNCTION public.check_profile_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If auth.uid() is null (service role), allow all changes
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

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
