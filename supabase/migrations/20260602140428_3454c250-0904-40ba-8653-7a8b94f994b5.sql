-- 1) Add paid status to variable expenses
ALTER TABLE public.variable_expenses
ADD COLUMN IF NOT EXISTS paid BOOLEAN NOT NULL DEFAULT false;

-- 2) Bill attachments table (persistent)
CREATE TABLE IF NOT EXISTS public.bill_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sub_account_id UUID REFERENCES public.sub_accounts(id) ON DELETE CASCADE,
  bill TEXT NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL DEFAULT 2026,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bill_attachments TO authenticated;
GRANT ALL ON public.bill_attachments TO service_role;

ALTER TABLE public.bill_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own bill_attachments"
ON public.bill_attachments
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE UNIQUE INDEX IF NOT EXISTS bill_attachments_user_bill_month_year_key
  ON public.bill_attachments (user_id, bill, month, year)
  WHERE sub_account_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS bill_attachments_user_bill_month_year_sub_key
  ON public.bill_attachments (user_id, bill, month, year, sub_account_id)
  WHERE sub_account_id IS NOT NULL;

CREATE TRIGGER update_bill_attachments_updated_at
BEFORE UPDATE ON public.bill_attachments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.bill_attachments;

-- 3) Storage policies for bill-attachments bucket (bucket created via tool below)
CREATE POLICY "Users can read own bill attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'bill-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload own bill attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'bill-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own bill attachments"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'bill-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own bill attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'bill-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);