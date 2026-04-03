
-- Fix profiles: remove default plan_expires_at so new users don't get free year
ALTER TABLE public.profiles ALTER COLUMN plan_expires_at SET DEFAULT NULL;
ALTER TABLE public.profiles ALTER COLUMN plan_started_at SET DEFAULT NULL;

-- Fix profiles SELECT policies: change from public to authenticated
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own non-plan fields" ON public.profiles;
CREATE POLICY "Users can update own non-plan fields" ON public.profiles FOR UPDATE TO authenticated 
USING (auth.uid() = id) 
WITH CHECK (
  (auth.uid() = id) 
  AND (plan = (SELECT p.plan FROM profiles p WHERE p.id = auth.uid())) 
  AND (NOT (plan_started_at IS DISTINCT FROM (SELECT p.plan_started_at FROM profiles p WHERE p.id = auth.uid()))) 
  AND (NOT (plan_expires_at IS DISTINCT FROM (SELECT p.plan_expires_at FROM profiles p WHERE p.id = auth.uid())))
);

-- Fix financial tables: change from public to authenticated
DROP POLICY IF EXISTS "Users manage own fixed_expenses" ON public.fixed_expenses;
CREATE POLICY "Users manage own fixed_expenses" ON public.fixed_expenses FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own variable_expenses" ON public.variable_expenses;
CREATE POLICY "Users manage own variable_expenses" ON public.variable_expenses FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own salary_configs" ON public.salary_configs;
CREATE POLICY "Users manage own salary_configs" ON public.salary_configs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own financial_goals" ON public.financial_goals;
CREATE POLICY "Users manage own financial_goals" ON public.financial_goals FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own user_settings" ON public.user_settings;
CREATE POLICY "Users manage own user_settings" ON public.user_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own incomes" ON public.incomes;
CREATE POLICY "Users manage own incomes" ON public.incomes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own bill_records" ON public.bill_records;
CREATE POLICY "Users manage own bill_records" ON public.bill_records FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Fix group_members
DROP POLICY IF EXISTS "Group owners can add members" ON public.group_members;
CREATE POLICY "Group owners can add members" ON public.group_members FOR INSERT TO authenticated WITH CHECK ((group_id IN (SELECT groups.id FROM groups WHERE groups.owner_id = auth.uid())) OR (user_id = auth.uid()));

DROP POLICY IF EXISTS "Group owners can remove members" ON public.group_members;
CREATE POLICY "Group owners can remove members" ON public.group_members FOR DELETE TO authenticated USING ((group_id IN (SELECT groups.id FROM groups WHERE groups.owner_id = auth.uid())) OR (user_id = auth.uid()));

DROP POLICY IF EXISTS "Members can view group members" ON public.group_members;
CREATE POLICY "Members can view group members" ON public.group_members FOR SELECT TO authenticated USING (group_id IN (SELECT gm.group_id FROM group_members gm WHERE gm.user_id = auth.uid()));

-- Fix groups
DROP POLICY IF EXISTS "Owners can delete their group" ON public.groups;
CREATE POLICY "Owners can delete their group" ON public.groups FOR DELETE TO authenticated USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can update their group" ON public.groups;
CREATE POLICY "Owners can update their group" ON public.groups FOR UPDATE TO authenticated USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can create groups" ON public.groups;
CREATE POLICY "Users can create groups" ON public.groups FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);

-- Fix suggestions
DROP POLICY IF EXISTS "Admins can view all suggestions" ON public.suggestions;
CREATE POLICY "Admins can view all suggestions" ON public.suggestions FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can view own suggestions" ON public.suggestions;
CREATE POLICY "Users can view own suggestions" ON public.suggestions FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Fix user_roles
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
