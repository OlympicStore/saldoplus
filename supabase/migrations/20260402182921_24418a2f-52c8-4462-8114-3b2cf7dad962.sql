
ALTER TABLE public.incomes ADD COLUMN IF NOT EXISTS account text NOT NULL DEFAULT '';
ALTER TABLE public.variable_expenses ADD COLUMN IF NOT EXISTS account text NOT NULL DEFAULT '';
ALTER TABLE public.fixed_expenses ADD COLUMN IF NOT EXISTS account text NOT NULL DEFAULT '';
