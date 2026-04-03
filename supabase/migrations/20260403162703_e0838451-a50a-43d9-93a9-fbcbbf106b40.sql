-- Sub-accounts table for Netflix-style multi-profile (Pro plan)
CREATE TABLE public.sub_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  avatar_color TEXT NOT NULL DEFAULT '#10B981',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sub_accounts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users manage own sub_accounts"
ON public.sub_accounts
FOR ALL
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Trigger to enforce max 3 sub-accounts per user
CREATE OR REPLACE FUNCTION public.check_max_sub_accounts()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.sub_accounts WHERE owner_id = NEW.owner_id) >= 3 THEN
    RAISE EXCEPTION 'Maximum of 3 sub-accounts per user';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_max_sub_accounts
BEFORE INSERT ON public.sub_accounts
FOR EACH ROW
EXECUTE FUNCTION public.check_max_sub_accounts();

-- Update timestamp trigger
CREATE TRIGGER update_sub_accounts_updated_at
BEFORE UPDATE ON public.sub_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add sub_account_id to all financial tables to scope data per sub-account
ALTER TABLE public.fixed_expenses ADD COLUMN sub_account_id UUID REFERENCES public.sub_accounts(id) ON DELETE CASCADE;
ALTER TABLE public.variable_expenses ADD COLUMN sub_account_id UUID REFERENCES public.sub_accounts(id) ON DELETE CASCADE;
ALTER TABLE public.incomes ADD COLUMN sub_account_id UUID REFERENCES public.sub_accounts(id) ON DELETE CASCADE;
ALTER TABLE public.investments ADD COLUMN sub_account_id UUID REFERENCES public.sub_accounts(id) ON DELETE CASCADE;
ALTER TABLE public.salary_configs ADD COLUMN sub_account_id UUID REFERENCES public.sub_accounts(id) ON DELETE CASCADE;
ALTER TABLE public.accounts ADD COLUMN sub_account_id UUID REFERENCES public.sub_accounts(id) ON DELETE CASCADE;
ALTER TABLE public.financial_goals ADD COLUMN sub_account_id UUID REFERENCES public.sub_accounts(id) ON DELETE CASCADE;
ALTER TABLE public.categories ADD COLUMN sub_account_id UUID REFERENCES public.sub_accounts(id) ON DELETE CASCADE;
ALTER TABLE public.user_settings ADD COLUMN sub_account_id UUID REFERENCES public.sub_accounts(id) ON DELETE CASCADE;
ALTER TABLE public.bill_records ADD COLUMN sub_account_id UUID REFERENCES public.sub_accounts(id) ON DELETE CASCADE;
ALTER TABLE public.category_budgets ADD COLUMN sub_account_id UUID REFERENCES public.sub_accounts(id) ON DELETE CASCADE;
ALTER TABLE public.transfers ADD COLUMN sub_account_id UUID REFERENCES public.sub_accounts(id) ON DELETE CASCADE;