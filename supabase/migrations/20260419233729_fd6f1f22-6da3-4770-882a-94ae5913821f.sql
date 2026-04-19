-- Estender tabela investments com campos para portfolio tracking
ALTER TABLE public.investments
  ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS current_value numeric NULL,
  ADD COLUMN IF NOT EXISTS current_value_updated_at timestamp with time zone NULL;

-- Backfill: usar 'description' como name para registos existentes onde name está vazio
UPDATE public.investments
SET name = COALESCE(NULLIF(description, ''), type)
WHERE name = '' OR name IS NULL;