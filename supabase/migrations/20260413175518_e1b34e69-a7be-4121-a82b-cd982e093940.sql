-- RLS: partners can view their own partner record
CREATE POLICY "Partners can view own partner record"
  ON public.partners FOR SELECT
  TO authenticated
  USING (
    id = (SELECT p.partner_id FROM public.profiles p WHERE p.id = auth.uid())
  );

-- RLS: partners can view invites for their own partner_id
CREATE POLICY "Partners can view own invites"
  ON public.partner_invites FOR SELECT
  TO authenticated
  USING (
    partner_id = (SELECT p.partner_id FROM public.profiles p WHERE p.id = auth.uid())
  );

-- RLS: partners can insert invites for their own partner_id
CREATE POLICY "Partners can insert own invites"
  ON public.partner_invites FOR INSERT
  TO authenticated
  WITH CHECK (
    partner_id = (SELECT p.partner_id FROM public.profiles p WHERE p.id = auth.uid())
  );

-- RLS: partners can view profiles of their clients
CREATE POLICY "Partners can view client profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    partner_id IS NOT NULL
    AND partner_id = (SELECT pr.partner_id FROM public.profiles pr WHERE pr.id = auth.uid())
  );

-- RLS: partners can view house_data of their clients
CREATE POLICY "Partners can view client house_data"
  ON public.house_data FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT pr.id FROM public.profiles pr
      WHERE pr.partner_id = (SELECT p2.partner_id FROM public.profiles p2 WHERE p2.id = auth.uid())
    )
  );

-- Partners can update their own partner record (branding etc)
CREATE POLICY "Partners can update own partner record"
  ON public.partners FOR UPDATE
  TO authenticated
  USING (
    id = (SELECT p.partner_id FROM public.profiles p WHERE p.id = auth.uid())
  )
  WITH CHECK (
    id = (SELECT p.partner_id FROM public.profiles p WHERE p.id = auth.uid())
  );