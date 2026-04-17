CREATE POLICY "Partners can update own invites"
ON public.partner_invites
FOR UPDATE
TO authenticated
USING (partner_id = (SELECT p.partner_id FROM profiles p WHERE p.id = auth.uid()))
WITH CHECK (partner_id = (SELECT p.partner_id FROM profiles p WHERE p.id = auth.uid()));