-- Fix 1: Restrict partner_invites delete policy to authenticated role only
DROP POLICY IF EXISTS "Partners can delete own invites" ON public.partner_invites;
CREATE POLICY "Partners can delete own invites"
ON public.partner_invites
FOR DELETE
TO authenticated
USING (
  partner_id IS NOT NULL
  AND partner_id = (SELECT p.partner_id FROM public.profiles p WHERE p.id = auth.uid())
);

-- Fix 2: Lock down realtime.messages so authenticated users can only subscribe to
-- their own user-scoped channel topics (matches `user-data-<uid>` pattern used by the app).
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read own realtime topics" ON realtime.messages;
CREATE POLICY "Authenticated can read own realtime topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = 'user-data-' || auth.uid()::text
);

DROP POLICY IF EXISTS "Authenticated can write own realtime topics" ON realtime.messages;
CREATE POLICY "Authenticated can write own realtime topics"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  realtime.topic() = 'user-data-' || auth.uid()::text
);