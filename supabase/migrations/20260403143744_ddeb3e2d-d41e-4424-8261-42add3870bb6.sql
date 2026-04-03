
ALTER TABLE public.variable_expenses ADD COLUMN recurring boolean NOT NULL DEFAULT false;

CREATE TABLE public.transfers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  from_account text NOT NULL DEFAULT '',
  to_account text NOT NULL DEFAULT '',
  value numeric NOT NULL DEFAULT 0,
  date text NOT NULL,
  description text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own transfers"
  ON public.transfers FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_transfers_updated_at
  BEFORE UPDATE ON public.transfers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
