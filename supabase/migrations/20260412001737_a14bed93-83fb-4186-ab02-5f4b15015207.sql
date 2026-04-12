
CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  _invite RECORD;
BEGIN
  -- Check for a pending partner invite
  SELECT pi.id, pi.partner_id, pi.expires_at
  INTO _invite
  FROM public.partner_invites pi
  WHERE pi.email = NEW.email
    AND pi.status = 'pending'
    AND (pi.expires_at IS NULL OR pi.expires_at > now())
  ORDER BY pi.created_at DESC
  LIMIT 1;

  IF _invite.id IS NOT NULL THEN
    -- Partner user: create profile with casa_segura_plus
    INSERT INTO public.profiles (id, email, full_name, plan, plan_source, partner_id, plan_started_at, plan_expires_at)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
      'casa_segura_plus',
      'partner',
      _invite.partner_id,
      now(),
      now() + interval '1 year'
    );

    -- Mark invite as accepted
    UPDATE public.partner_invites SET status = 'accepted' WHERE id = _invite.id;
  ELSE
    -- Normal user
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
