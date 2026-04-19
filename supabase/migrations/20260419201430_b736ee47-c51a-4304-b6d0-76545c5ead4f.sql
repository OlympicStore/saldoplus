ALTER TABLE public.house_data
  ADD COLUMN IF NOT EXISTS rate_type text NOT NULL DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS indexante numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS spread numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fixed_period_years integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fixed_rate_initial numeric NOT NULL DEFAULT 0;