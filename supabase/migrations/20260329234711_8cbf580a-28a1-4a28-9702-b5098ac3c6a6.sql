
ALTER TABLE public.profiles 
ADD COLUMN plan_started_at timestamp with time zone DEFAULT now(),
ADD COLUMN plan_expires_at timestamp with time zone DEFAULT (now() + interval '1 year' - interval '1 day');
