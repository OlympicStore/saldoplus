ALTER TABLE public.mortgage_simulations
  ADD COLUMN IF NOT EXISTS rate_type text NOT NULL DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS indexante numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS spread numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fixed_period_years integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fixed_rate_initial numeric NOT NULL DEFAULT 0;

ALTER TABLE public.mortgage_simulations
  DROP CONSTRAINT IF EXISTS mortgage_simulations_rate_type_check;
ALTER TABLE public.mortgage_simulations
  ADD CONSTRAINT mortgage_simulations_rate_type_check
  CHECK (rate_type IN ('fixed', 'variable', 'mixed'));