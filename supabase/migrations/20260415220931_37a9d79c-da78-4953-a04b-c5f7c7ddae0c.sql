CREATE POLICY "Consultants can update own record"
ON public.partner_consultants FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());