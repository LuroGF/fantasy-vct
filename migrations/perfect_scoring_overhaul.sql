-- =====================================================
-- PERFECT SCORING OVERHAUL: BALANCED & REWARDING
-- =====================================================

CREATE OR REPLACE FUNCTION public.calculate_fantasy_points()
RETURNS TRIGGER AS $$
DECLARE
    points integer := 0;
    final_role text;
BEGIN
    -- 1. Get player role if not provided or to ensure accuracy
    SELECT role INTO final_role FROM public.pro_players WHERE id = NEW.player_id;
    final_role := COALESCE(final_role, 'Default');

    -- 2. SCORING LOGIC BY ROLE
    CASE 
        WHEN final_role = 'Duelista' THEN
            -- DUELIST: High reward for kills and FBs, high penalty for FDs
            points := floor(
                NEW.kills * 1 + 
                NEW.assists * 0.5 + 
                NEW.deaths * -1 + 
                NEW.fb * 5 + 
                NEW.fd * -3 + 
                NEW.clutches * 4
            );
            -- Match Bonuses
            IF NEW.kills >= 45 THEN points := points + 10; END IF;
            IF NEW.mvp THEN points := points + 10; END IF;

        WHEN final_role = 'Centinela' THEN
            -- SENTINEL: Survival and impact kills (surviving is key)
            points := floor(
                NEW.kills * 2 + 
                NEW.assists * 0.5 + 
                NEW.deaths * -1 + 
                NEW.fb * 6 + 
                NEW.fd * -4 + 
                NEW.clutches * 6
            );
            -- Match Bonuses
            IF NEW.clutches >= 3 THEN points := points + 10; END IF;
            IF NEW.mvp THEN points := points + 5; END IF;

        WHEN final_role = 'Iniciador' OR final_role = 'Controlador' THEN
            -- SUPPORT/INITIATOR: Heavy weight on assists and consistency
            points := floor(
                NEW.kills * 1.5 + 
                NEW.assists * 2 + 
                NEW.deaths * -1 + 
                NEW.fb * 3 + 
                NEW.fd * -2 + 
                NEW.clutches * 4
            );
            -- Match Bonuses
            IF NEW.assists >= 20 THEN points := points + 10; END IF;
            IF NEW.mvp THEN points := points + 5; END IF;

        ELSE
            -- FLEX / DEFAULT: Balanced
            points := floor(
                NEW.kills * 1.5 + 
                NEW.assists * 1 + 
                NEW.deaths * -1 + 
                NEW.fb * 4 + 
                NEW.fd * -3 + 
                NEW.clutches * 5
            );
            IF NEW.mvp THEN points := points + 7; END IF;
    END CASE;

    -- 3. LEGEND BONUS (Only if player is_legend)
    DECLARE
        v_is_legend BOOLEAN;
    BEGIN
        SELECT is_legend INTO v_is_legend FROM public.pro_players WHERE id = NEW.player_id;
        IF v_is_legend THEN
            points := points + public.calculate_legend_points(NEW.match_id, NEW.player_id);
        END IF;
    END;

    -- 4. ENSURE NO NEGATIVE POINTS (Optional, usually 0 is minimum for a bad match)
    IF points < 0 THEN points := 0; END IF;

    -- 4. UPDATE RECORD
    NEW.fantasy_points := points;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- RE-CREATE TRIGGER to ensure it's pointing correctly
DROP TRIGGER IF EXISTS tr_calculate_points ON public.player_performances;
CREATE TRIGGER tr_calculate_points
    BEFORE INSERT OR UPDATE ON public.player_performances
    FOR EACH ROW
    EXECUTE FUNCTION public.calculate_fantasy_points();


-- IMPROVED LEGEND POINTS: Make them more iconic
CREATE OR REPLACE FUNCTION public.calculate_legend_points(match_id uuid, legend_id uuid)
RETURNS integer AS $$
DECLARE
    points integer := 10; -- Base points
    legend_nick text;
    m_data RECORD;
BEGIN
    SELECT nickname INTO legend_nick FROM public.pro_players WHERE id = legend_id;
    
    -- Extract match aggregates
    SELECT 
        SUM(clutches) as c, 
        SUM(fb) as fb, 
        MAX(acs) as max_acs,
        SUM(kills) as k,
        SUM(assists) as a
    INTO m_data
    FROM public.player_performances 
    WHERE public.player_performances.match_id = $1;

    CASE 
        WHEN legend_nick = 'Mixwell' THEN
            -- Mixwell "The King": Points based on total First Bloods (Opening impact)
            points := points + (COALESCE(m_data.fb, 0) * 5);
        
        WHEN legend_nick = 'ScreaM' THEN
            -- ScreaM "Headshot Machine": Points based on the highest ACS of the match
            points := points + floor(COALESCE(m_data.max_acs, 0) / 10);
            
        WHEN legend_nick = 'Hiko' THEN
            -- Hiko "Clutch King": Heavy multiplier on total clutches
            points := points + (COALESCE(m_data.c, 0) * 15);
            
        WHEN legend_nick = 'TenZ' THEN
            -- TenZ "Duelist Prodigy": Points based on total kills in the match
            points := points + floor(COALESCE(m_data.k, 0) / 2);

        ELSE
            -- Default for other legends
            points := points + 20;
    END CASE;

    RETURN points;
END;
$$ LANGUAGE plpgsql;
