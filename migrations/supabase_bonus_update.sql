-- ============================================
-- DAILY BONUS SCHEMA UPDATE
-- ============================================

-- Add last_bonus_claim_at to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_bonus_claim_at timestamp with time zone;
