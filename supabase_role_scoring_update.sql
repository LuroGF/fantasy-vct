-- ============================================
-- FLEX ROLE & PER-AGENT SCORING MIGRATION
-- ============================================

-- 1. Update pro_players role constraint to include 'Flex'
ALTER TABLE public.pro_players DROP CONSTRAINT IF EXISTS pro_players_role_check;
ALTER TABLE public.pro_players ADD CONSTRAINT pro_players_role_check 
CHECK (role IN ('Duelista', 'Iniciador', 'Controlador', 'Centinela', 'Flex'));

-- 2. Update player_performances to track agent and its role
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='player_performances' AND column_name='agent_name') THEN
        ALTER TABLE public.player_performances ADD COLUMN agent_name text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='player_performances' AND column_name='agent_role') THEN
        ALTER TABLE public.player_performances ADD COLUMN agent_role text;
    END IF;
END $$;

-- 3. Update Scoring Logic Trigger
CREATE OR REPLACE FUNCTION public.calculate_fantasy_points() RETURNS trigger AS $$
DECLARE
    final_role text;
    points integer := 0;
BEGIN
    -- Priority: 
    -- 1. Agent Role from performance (scraped for the specific match)
    -- 2. Player Role from pro_players (fallback)
    
    IF NEW.agent_role IS NOT NULL AND NEW.agent_role != '' THEN
        final_role := NEW.agent_role;
    ELSE
        SELECT role INTO final_role FROM public.pro_players WHERE id = NEW.player_id;
    END IF;

    -- Scoring logic by role
    IF final_role = 'Duelista' THEN
        points := floor(NEW.kills * 1 + NEW.assists * 0.5 + NEW.fb * 5 + NEW.fd * -3 + NEW.deaths * -1);
        IF NEW.kills >= 45 THEN points := points + 10; END IF;
        IF NEW.mvp THEN points := points + 10; END IF; -- Buffed MVP for duelists
    ELSIF final_role = 'Centinela' THEN
        points := floor(NEW.kills * 2 + NEW.assists * 0.5 + NEW.fb * 6 + NEW.fd * -4 + NEW.deaths * -1);
        IF NEW.mvp THEN points := points + 5; END IF;
    ELSIF final_role = 'Iniciador' OR final_role = 'Controlador' THEN
        points := floor(NEW.kills * 1.5 + NEW.assists * 2 + NEW.fb * 3 + NEW.fd * -2 + NEW.deaths * -1);
        -- Bonus for 20+ assists
        IF NEW.assists >= 20 THEN points := points + 10; END IF;
        IF NEW.mvp THEN points := points + 5; END IF;
    ELSE
        -- Default/Flex fallback if no specific role detected
        points := floor(NEW.kills * 2 + NEW.assists * 1 + NEW.fb * 3 + NEW.clutches * 4);
        IF NEW.kills < NEW.deaths THEN points := points - 1; END IF;
    END IF;

    NEW.fantasy_points := points;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
