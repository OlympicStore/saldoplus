-- Add year column to bill_records
ALTER TABLE public.bill_records ADD COLUMN year integer NOT NULL DEFAULT 2026;

-- Drop old unique constraint if exists and create new one with year
DO $$
BEGIN
  -- Try dropping the constraint by common names
  BEGIN
    ALTER TABLE public.bill_records DROP CONSTRAINT IF EXISTS bill_records_user_id_bill_month_key;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER TABLE public.bill_records DROP CONSTRAINT IF EXISTS unique_bill_record;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

-- Drop any remaining unique index on (user_id, bill, month)
DROP INDEX IF EXISTS bill_records_user_id_bill_month_key;
DROP INDEX IF EXISTS unique_bill_record;

-- Create new unique constraint including year
CREATE UNIQUE INDEX bill_records_user_id_bill_month_year_key ON public.bill_records (user_id, bill, month, year) WHERE sub_account_id IS NULL;
CREATE UNIQUE INDEX bill_records_user_id_bill_month_year_sub_key ON public.bill_records (user_id, bill, month, year, sub_account_id) WHERE sub_account_id IS NOT NULL;