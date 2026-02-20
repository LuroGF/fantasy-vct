-- =====================================================
-- DATABASE CLEANUP: NORMALIZE EXISTING NAMES
-- =====================================================

-- 1. Clean Pro Team Names and Tags
UPDATE public.pro_teams
SET 
    name = TRIM(REGEXP_REPLACE(name, '^(TEAM|CLUB)\s+', '', 'i')),
    tag = CASE 
        WHEN name ILIKE '%FNATIC%' THEN 'FNC'
        WHEN name ILIKE '%VITALITY%' THEN 'VIT'
        WHEN name ILIKE '%HERETICS%' THEN 'TH'
        WHEN name ILIKE '%KARMINE%' THEN 'KC'
        WHEN name ILIKE '%NAVI%' OR name ILIKE '%NATUS VINCERE%' THEN 'NAVI'
        WHEN name ILIKE '%BBL%' THEN 'BBL'
        WHEN name ILIKE '%FUT%' THEN 'FUT'
        WHEN name ILIKE '%GIANTX%' THEN 'GX'
        WHEN name ILIKE '%KOI%' THEN 'KOI'
        WHEN name ILIKE '%LIQUID%' THEN 'TL'
        WHEN name ILIKE '%GENTLE MATES%' THEN 'M8'
        ELSE UPPER(SUBSTRING(name FROM 1 FOR 4))
    END;

-- 2. Final trim of tags to remove spaces if substring was < 4
UPDATE public.pro_teams SET tag = TRIM(tag);

-- 3. Clean Player Nicknames (Remove common tag patterns if they leaked)
UPDATE public.pro_players
SET nickname = TRIM(REGEXP_REPLACE(nickname, '^\[.*?\]\s*', '', 'i'))
WHERE nickname ~ '^\[.*?\]';

UPDATE public.pro_players
SET nickname = TRIM(REGEXP_REPLACE(nickname, '\s+\[.*?\]$', '', 'i'))
WHERE nickname ~ '\[.*?\]$';

-- 4. Correct casing for specific iconic teams
UPDATE public.pro_teams SET name = 'Fnatic' WHERE tag = 'FNC';
UPDATE public.pro_teams SET name = 'Team Vitality' WHERE tag = 'VIT';
UPDATE public.pro_teams SET name = 'Team Heretics' WHERE tag = 'TH';
UPDATE public.pro_teams SET name = 'Karmine Corp' WHERE tag = 'KC';
UPDATE public.pro_teams SET name = 'Natus Vincere' WHERE tag = 'NAVI';
UPDATE public.pro_teams SET name = 'FUT Esports' WHERE tag = 'FUT';
UPDATE public.pro_teams SET name = 'GIANTX' WHERE tag = 'GX';
UPDATE public.pro_teams SET name = 'Movistar KOI' WHERE tag = 'KOI';
UPDATE public.pro_teams SET name = 'Team Liquid' WHERE tag = 'TL';
UPDATE public.pro_teams SET name = 'Gentle Mates' WHERE tag = 'M8';
