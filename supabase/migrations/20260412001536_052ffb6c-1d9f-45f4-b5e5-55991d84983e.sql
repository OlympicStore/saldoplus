
-- 1. Create plans table
CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  type text NOT NULL DEFAULT 'b2c' CHECK (type IN ('b2c', 'partner')),
  features jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can view plans" ON public.plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage plans" ON public.plans FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.plans (name, type, features) VALUES
  ('essencial', 'b2c', '{"tabs":["home","saldo","entradas","despesas","conta"],"goals":false,"ai":false,"multi_account":false}'),
  ('casa', 'b2c', '{"tabs":["home","saldo","entradas","despesas","investimentos","anual","metas","conta"],"goals":true,"ai":false,"multi_account":false}'),
  ('pro', 'b2c', '{"tabs":["home","saldo","entradas","despesas","investimentos","anual","metas","orcamentos","conta"],"goals":true,"ai":true,"multi_account":true}'),
  ('casa_segura_plus', 'partner', '{"tabs":["home","saldo","entradas","despesas","investimentos","anual","metas","orcamentos","minha_casa","conta"],"goals":true,"ai":true,"multi_account":true}');

-- 2. Create partners table
CREATE TABLE public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  plan_limit integer NOT NULL DEFAULT 25,
  plan_type text NOT NULL DEFAULT 'starter' CHECK (plan_type IN ('starter', 'growth', 'premium')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage partners" ON public.partners FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. Create partner_invites table
CREATE TABLE public.partner_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.partner_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage invites" ON public.partner_invites FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own invites" ON public.partner_invites FOR SELECT TO authenticated USING (email = (SELECT p.email FROM public.profiles p WHERE p.id = auth.uid()));

-- 4. Update profiles: drop blocking policy, change type, add columns, recreate policy
DROP POLICY IF EXISTS "Users can update own non-plan fields" ON public.profiles;

ALTER TABLE public.profiles ALTER COLUMN plan TYPE text USING plan::text;
ALTER TABLE public.profiles ALTER COLUMN plan SET DEFAULT 'essencial';
ALTER TABLE public.profiles ADD COLUMN partner_id uuid REFERENCES public.partners(id);
ALTER TABLE public.profiles ADD COLUMN plan_source text NOT NULL DEFAULT 'direct' CHECK (plan_source IN ('direct', 'partner'));

CREATE POLICY "Users can update own non-plan fields"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND plan = (SELECT p.plan FROM public.profiles p WHERE p.id = auth.uid())
    AND NOT (plan_started_at IS DISTINCT FROM (SELECT p.plan_started_at FROM public.profiles p WHERE p.id = auth.uid()))
    AND NOT (plan_expires_at IS DISTINCT FROM (SELECT p.plan_expires_at FROM public.profiles p WHERE p.id = auth.uid()))
    AND NOT (partner_id IS DISTINCT FROM (SELECT p.partner_id FROM public.profiles p WHERE p.id = auth.uid()))
    AND NOT (plan_source IS DISTINCT FROM (SELECT p.plan_source FROM public.profiles p WHERE p.id = auth.uid()))
  );

DROP TYPE IF EXISTS public.app_plan;

-- 5. Create house_data table
CREATE TABLE public.house_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  house_value numeric NOT NULL DEFAULT 0,
  monthly_payment numeric NOT NULL DEFAULT 0,
  estimated_expenses numeric NOT NULL DEFAULT 0,
  monthly_income numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.house_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own house_data" ON public.house_data FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_house_data_updated_at BEFORE UPDATE ON public.house_data FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
