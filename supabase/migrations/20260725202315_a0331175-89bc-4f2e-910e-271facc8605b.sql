
CREATE TABLE public.ai_action_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.ai_conversations(id) ON DELETE SET NULL,
  kind text NOT NULL,
  target_table text NOT NULL,
  target_id uuid,
  snapshot jsonb,
  undone boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_action_log TO authenticated;
GRANT ALL ON public.ai_action_log TO service_role;
ALTER TABLE public.ai_action_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_ai_action_log" ON public.ai_action_log
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE INDEX ai_action_log_user_created_idx ON public.ai_action_log(user_id, created_at DESC);
