-- Create payment_history table
CREATE TABLE public.payment_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  old_value numeric NOT NULL DEFAULT 0,
  new_value numeric NOT NULL DEFAULT 0,
  changed_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own payment_history"
  ON public.payment_history FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Fix handle_new_user trigger to use 'imobiliaria' instead of 'parceiro_pro'
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      'imobiliaria',
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
$function$;