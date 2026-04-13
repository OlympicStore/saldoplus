-- 1. Rename plan in profiles
UPDATE public.profiles SET plan = 'parceiro_pro' WHERE plan = 'casa_segura_plus';

-- 2. Rename plan in plans table
UPDATE public.plans SET name = 'parceiro_pro' WHERE name = 'casa_segura_plus';

-- 3. Add monthly payment status to house_data
ALTER TABLE public.house_data
  ADD COLUMN IF NOT EXISTS monthly_payment_status jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 4. Recreate handle_new_user with new plan name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _invite RECORD;
BEGIN
  SELECT pi.id, pi.partner_id, pi.expires_at
  INTO _invite
  FROM public.partner_invites pi
  WHERE pi.email = NEW.email
    AND pi.status = 'pending'
    AND (pi.expires_at IS NULL OR pi.expires_at > now())
  ORDER BY pi.created_at DESC
  LIMIT 1;

  IF _invite.id IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, full_name, plan, plan_source, partner_id, plan_started_at, plan_expires_at)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
      'parceiro_pro',
      'partner',
      _invite.partner_id,
      now(),
      now() + interval '1 year'
    );
    UPDATE public.partner_invites SET status = 'accepted' WHERE id = _invite.id;
  ELSE
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')
    );
  END IF;

  RETURN NEW;
END;
$$;