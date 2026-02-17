-- ============================================
-- SUPPORT FOR PER-MAP STATISTICS
-- ============================================

-- 1. Add map_name column to player_performances
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='player_performances' AND column_name='map_name') THEN
        ALTER TABLE public.player_performances ADD COLUMN map_name text DEFAULT 'Map 1';
    END IF;
END $$;

-- 2. Update unique constraint to allow multiple maps per match per player
ALTER TABLE public.player_performances DROP CONSTRAINT IF EXISTS player_performances_match_player_unique;

-- Check if the constraint already exists with map_name
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'player_performances_match_player_map_unique'
    ) THEN
        ALTER TABLE public.player_performances 
        ADD CONSTRAINT player_performances_match_player_map_unique 
        UNIQUE (match_id, player_id, map_name);
    END IF;
END $$;
