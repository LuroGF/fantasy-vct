-- ============================================
-- FANTASY VCT - COMPLETE DATABASE MIGRATION
-- ============================================
-- This script ensures all tables, columns, constraints, and RLS policies
-- are aligned with the current application logic.
-- Run this in your Supabase SQL Editor.

-- ============================================
-- 1. ADD MISSING COLUMNS
-- ============================================

-- Add is_starter column to user_rosters (for lineup management)
ALTER TABLE user_rosters 
ADD COLUMN IF NOT EXISTS is_starter boolean NOT NULL DEFAULT false;

-- Add release_clause column to user_rosters (for clause payments)
ALTER TABLE user_rosters 
ADD COLUMN IF NOT EXISTS release_clause bigint NULL;

-- Add transfers_made_this_week to league_participants (for transfer limits)
ALTER TABLE league_participants 
ADD COLUMN IF NOT EXISTS transfers_made_this_week integer NOT NULL DEFAULT 0;

-- ============================================
-- 2. UPDATE CONSTRAINTS
-- ============================================

-- Update market_transactions type check to allow 'clause_paid'
ALTER TABLE market_transactions 
DROP CONSTRAINT IF EXISTS market_transactions_type_check;

ALTER TABLE market_transactions 
ADD CONSTRAINT market_transactions_type_check 
CHECK (type IN ('buy', 'sell', 'clause_paid'));

-- ============================================
-- 3. CREATE TRIGGERS FOR BUSINESS LOGIC
-- ============================================

-- Trigger: Enforce maximum 5 starters per team
CREATE OR REPLACE FUNCTION check_starter_limit()
RETURNS TRIGGER AS $$
DECLARE
    starter_count INTEGER;
BEGIN
    IF NEW.is_starter = true THEN
        SELECT COUNT(*) INTO starter_count
        FROM user_rosters
        WHERE league_id = NEW.league_id 
          AND profile_id = NEW.profile_id 
          AND is_starter = true 
          AND id != NEW.id; -- Exclude self if updating
        
        IF starter_count >= 5 THEN
            RAISE EXCEPTION 'Maximum limit of 5 starters reached for this team.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_check_starter_limit ON user_rosters;
CREATE TRIGGER tr_check_starter_limit
BEFORE INSERT OR UPDATE ON user_rosters
FOR EACH ROW
EXECUTE FUNCTION check_starter_limit();

-- ============================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables (if not already enabled)
ALTER TABLE gameweeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_scores_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_performances ENABLE ROW LEVEL SECURITY;
ALTER TABLE pro_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE pro_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_rosters ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Public read access for gameweeks" ON gameweeks;
DROP POLICY IF EXISTS "Public read access for matches" ON matches;
DROP POLICY IF EXISTS "Public read access for pro_players" ON pro_players;
DROP POLICY IF EXISTS "Public read access for pro_teams" ON pro_teams;
DROP POLICY IF EXISTS "Public read access for player_performances" ON player_performances;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view leagues they participate in" ON leagues;
DROP POLICY IF EXISTS "Users can view league participants" ON league_participants;
DROP POLICY IF EXISTS "Users can update their own participant data" ON league_participants;
DROP POLICY IF EXISTS "Users can view their own rosters" ON user_rosters;
DROP POLICY IF EXISTS "Users can manage their own rosters" ON user_rosters;
DROP POLICY IF EXISTS "Users can view their own transactions" ON market_transactions;
DROP POLICY IF EXISTS "Users can view their own scores" ON participant_scores_history;

-- Gameweeks: Public read access
CREATE POLICY "Public read access for gameweeks"
ON gameweeks FOR SELECT
USING (true);

-- Matches: Public read access
CREATE POLICY "Public read access for matches"
ON matches FOR SELECT
USING (true);

-- Pro Players: Public read access
CREATE POLICY "Public read access for pro_players"
ON pro_players FOR SELECT
USING (true);

-- Pro Teams: Public read access
CREATE POLICY "Public read access for pro_teams"
ON pro_teams FOR SELECT
USING (true);

-- Player Performances: Public read access
CREATE POLICY "Public read access for player_performances"
ON player_performances FOR SELECT
USING (true);

-- Profiles: Users can view and update their own profile
CREATE POLICY "Users can view their own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- Leagues: Users can view leagues they participate in
CREATE POLICY "Users can view leagues they participate in"
ON leagues FOR SELECT
USING (
    id IN (
        SELECT league_id 
        FROM league_participants 
        WHERE profile_id = auth.uid()
    )
);

-- League Participants: Users can view all participants in their leagues
CREATE POLICY "Users can view league participants"
ON league_participants FOR SELECT
USING (
    league_id IN (
        SELECT league_id 
        FROM league_participants 
        WHERE profile_id = auth.uid()
    )
);

CREATE POLICY "Users can update their own participant data"
ON league_participants FOR UPDATE
USING (profile_id = auth.uid());

-- User Rosters: Users can view and manage rosters in their leagues
CREATE POLICY "Users can view their own rosters"
ON user_rosters FOR SELECT
USING (
    league_id IN (
        SELECT league_id 
        FROM league_participants 
        WHERE profile_id = auth.uid()
    )
);

CREATE POLICY "Users can manage their own rosters"
ON user_rosters FOR ALL
USING (profile_id = auth.uid());

-- Market Transactions: Users can view transactions in their leagues
CREATE POLICY "Users can view their own transactions"
ON market_transactions FOR SELECT
USING (
    league_id IN (
        SELECT league_id 
        FROM league_participants 
        WHERE profile_id = auth.uid()
    )
);

-- Participant Scores History: Users can view scores in their leagues
CREATE POLICY "Users can view their own scores"
ON participant_scores_history FOR SELECT
USING (
    league_id IN (
        SELECT league_id 
        FROM league_participants 
        WHERE profile_id = auth.uid()
    )
);

-- ============================================
-- 5. CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_user_rosters_league_profile 
ON user_rosters(league_id, profile_id);

CREATE INDEX IF NOT EXISTS idx_user_rosters_is_starter 
ON user_rosters(is_starter) WHERE is_starter = true;

CREATE INDEX IF NOT EXISTS idx_league_participants_profile 
ON league_participants(profile_id);

CREATE INDEX IF NOT EXISTS idx_market_transactions_league 
ON market_transactions(league_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_matches_gameweek 
ON matches(gameweek_id);

CREATE INDEX IF NOT EXISTS idx_matches_status 
ON matches(status);

CREATE INDEX IF NOT EXISTS idx_player_performances_match 
ON player_performances(match_id);

CREATE INDEX IF NOT EXISTS idx_participant_scores_gameweek 
ON participant_scores_history(gameweek_id);

-- ============================================
-- 6. DATA CLEANUP (OPTIONAL)
-- ============================================

-- Reset transfers_made_this_week for all participants (run this weekly via cron)
-- UPDATE league_participants SET transfers_made_this_week = 0;

-- Set default release_clause for existing rosters (1.5x market value)
UPDATE user_rosters ur
SET release_clause = COALESCE(ur.release_clause, FLOOR(pp.market_value * 1.5))
FROM pro_players pp
WHERE ur.player_id = pp.id
  AND ur.release_clause IS NULL;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- All tables, columns, constraints, and RLS policies are now aligned.
-- Your application should work correctly after running this script.
