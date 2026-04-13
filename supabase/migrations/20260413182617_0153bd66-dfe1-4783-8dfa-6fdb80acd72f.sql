-- Fix KW test partner profile to have correct plan
UPDATE public.profiles 
SET plan = 'imobiliaria', plan_source = 'partner'
WHERE email = 'kw@teste.pt';

-- Also update admin-create-partner trigger: ensure new partner users get imobiliaria plan
-- Update the admin-create-partner function behavior by fixing profiles after partner creation
