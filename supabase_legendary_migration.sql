-- Migration: Legendary Players & Finals
ALTER TABLE public.pro_players ADD COLUMN IF NOT EXISTS is_legend boolean DEFAULT false;
ALTER TABLE public.gameweeks ADD COLUMN IF NOT EXISTS is_final boolean DEFAULT false;

-- Example legends
INSERT INTO public.pro_players (nickname, full_name, role, market_value, is_legend, photo_url) VALUES
('Mixwell', 'Oscar Cañellas', 'Duelista', 25000000, true, 'https://owcdn.ut3.com/vlr/players/mixwell.png'),
('ScreaM', 'Adil Benrlitom', 'Duelista', 22000000, true, 'https://owcdn.ut3.com/vlr/players/scream.png'),
('Hiko', 'Spencer Martin', 'Iniciador', 20000000, true, 'https://owcdn.ut3.com/vlr/players/hiko.png'),
('TenZ', 'Tyson Ngo', 'Duelista', 30000000, true, 'https://owcdn.ut3.com/vlr/players/tenz.png')
ON CONFLICT (nickname) DO UPDATE SET is_legend = true;

-- Update points calculation for legends
-- We will implement a function that calculates legend points based on match aggregate
CREATE OR REPLACE FUNCTION public.calculate_legend_points(match_id uuid, legend_id uuid)
RETURNS integer AS $$
DECLARE
    points integer := 0;
    legend_nick text;
    total_clutches integer := 0;
    total_fb integer := 0;
    max_acs integer := 0;
BEGIN
    SELECT nickname INTO legend_nick FROM public.pro_players WHERE id = legend_id;
    
    -- Extract match aggregates
    SELECT SUM(clutches), SUM(fb), MAX(acs) 
    INTO total_clutches, total_fb, max_acs
    FROM public.player_performances 
    WHERE match_id = match_id;

    IF legend_nick = 'Mixwell' THEN
        -- Mixwell: Points based on team effectiveness in opening duels
        points := total_fb * 4;
    ELSIF legend_nick = 'Hiko' THEN
        -- Hiko: Points based on clutches happening in the match
        points := total_clutches * 12;
    ELSIF legend_nick = 'ScreaM' THEN
        -- ScreaM: Points based on the highest performance of the match
        points := floor(max_acs / 10);
    ELSE
        -- Default legend points
        points := 15;
    END IF;

    RETURN points;
END;
$$ LANGUAGE plpgsql;
