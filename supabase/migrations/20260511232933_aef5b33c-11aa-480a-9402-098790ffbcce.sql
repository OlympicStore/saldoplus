DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'fixed_expenses','variable_expenses','incomes','salary_configs',
    'financial_goals','bill_records','user_settings','accounts',
    'investments','categories','transfers'
  ] LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', t);
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END LOOP;
END $$;