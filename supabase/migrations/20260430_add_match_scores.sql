-- Add score columns to matches table
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS team_a_score INTEGER DEFAULT 0;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS team_b_score INTEGER DEFAULT 0;

-- Comment on columns for clarity
COMMENT ON COLUMN public.matches.team_a_score IS 'Score for team_a in this match';
COMMENT ON COLUMN public.matches.team_b_score IS 'Score for team_b in this match';
