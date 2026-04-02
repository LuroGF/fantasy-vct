
-- ============================================
-- FIX: ADD CLUTCHES TO ROLE-BASED SCORING
-- ============================================

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

    -- Base Clutch points for everyone (4 per clutch)
    points := (COALESCE(NEW.clutches, 0) * 4);

    -- Scoring logic by role
    IF final_role = 'Duelista' THEN
        points := points + floor(NEW.kills * 1.5 + NEW.assists * 0.5 + NEW.fb * 5 + NEW.fd * -3 + NEW.deaths * -1);
        IF NEW.kills >= 45 THEN points := points + 10; END IF;
        IF NEW.mvp THEN points := points + 10; END IF;
    ELSIF final_role = 'Centinela' THEN
        points := points + floor(NEW.kills * 2 + NEW.assists * 0.5 + NEW.fb * 6 + NEW.fd * -4 + NEW.deaths * -1);
        IF NEW.mvp THEN points := points + 5; END IF;
    ELSIF final_role = 'Iniciador' OR final_role = 'Controlador' THEN
        points := points + floor(NEW.kills * 1.5 + NEW.assists * 2 + NEW.fb * 3 + NEW.fd * -2 + NEW.deaths * -1);
        IF NEW.assists >= 20 THEN points := points + 10; END IF;
        IF NEW.mvp THEN points := points + 5; END IF;
    ELSE
        -- Default/Flex/Unknown fallback
        points := points + floor(NEW.kills * 2 + NEW.assists * 1 + NEW.fb * 3);
        IF NEW.kills < NEW.deaths THEN points := points - 1; END IF;
        IF NEW.mvp THEN points := points + 6; END IF;
    END IF;

    NEW.fantasy_points := points;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
