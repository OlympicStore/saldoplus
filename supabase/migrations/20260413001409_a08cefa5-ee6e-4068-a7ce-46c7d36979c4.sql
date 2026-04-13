ALTER TABLE public.house_data
  ADD COLUMN IF NOT EXISTS down_payment numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extra_expenses jsonb NOT NULL DEFAULT '[]'::jsonb;