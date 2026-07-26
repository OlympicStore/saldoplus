
CREATE TABLE public.other_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'outro',
  doc_date DATE,
  expires_at DATE,
  amount NUMERIC(12,2),
  attachment_url TEXT,
  attachment_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.other_documents TO authenticated;
GRANT ALL ON public.other_documents TO service_role;

ALTER TABLE public.other_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own other_documents"
  ON public.other_documents FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_other_documents_updated_at
  BEFORE UPDATE ON public.other_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX other_documents_user_created_idx
  ON public.other_documents (user_id, created_at DESC);
