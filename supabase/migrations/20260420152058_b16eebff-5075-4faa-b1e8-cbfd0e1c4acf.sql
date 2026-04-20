ALTER TABLE public.house_data
  ADD COLUMN IF NOT EXISTS euribor_term text NOT NULL DEFAULT '6m',
  ADD COLUMN IF NOT EXISTS mixed_phase2_acknowledged boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fixed_indexante numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fixed_spread numeric NOT NULL DEFAULT 0;