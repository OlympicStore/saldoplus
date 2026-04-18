-- Tabela para guardar simulações de crédito habitação
CREATE TABLE public.mortgage_simulations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Simulação',
  loan_amount NUMERIC NOT NULL DEFAULT 0,
  annual_rate NUMERIC NOT NULL DEFAULT 0,
  term_years INTEGER NOT NULL DEFAULT 30,
  monthly_income NUMERIC NOT NULL DEFAULT 0,
  extra_monthly_costs NUMERIC NOT NULL DEFAULT 0,
  extra_payment NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.mortgage_simulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own mortgage_simulations"
ON public.mortgage_simulations
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Parceiros e consultores podem ver simulações dos seus clientes
CREATE POLICY "Partners can view client mortgage_simulations"
ON public.mortgage_simulations
FOR SELECT
TO authenticated
USING (user_id IN (
  SELECT pr.id FROM public.profiles pr
  WHERE pr.partner_id = (SELECT p2.partner_id FROM public.profiles p2 WHERE p2.id = auth.uid())
));

CREATE POLICY "Consultants can view client mortgage_simulations"
ON public.mortgage_simulations
FOR SELECT
TO authenticated
USING (user_id IN (SELECT public.get_consultant_client_ids(auth.uid())));

CREATE TRIGGER update_mortgage_simulations_updated_at
BEFORE UPDATE ON public.mortgage_simulations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_mortgage_simulations_user ON public.mortgage_simulations(user_id, created_at DESC);