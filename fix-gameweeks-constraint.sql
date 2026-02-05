-- Add unique constraint to start_date to prevent duplicate gameweeks
ALTER TABLE public.gameweeks ADD CONSTRAINT gameweeks_start_date_key UNIQUE (start_date);
