-- =====================================================
-- REFUERZO DE INTEGRIDAD DE DATOS (FANTASY VCT)
-- Asegura que no haya duplicados y mejora el seguimiento vía VLR_ID
-- =====================================================

-- 1. Añadir vlr_id a pro_teams si no existe
ALTER TABLE public.pro_teams ADD COLUMN IF NOT EXISTS vlr_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_pro_teams_vlr_id ON public.pro_teams(vlr_id);

-- 2. Añadir vlr_id a pro_players si no existe
ALTER TABLE public.pro_players ADD COLUMN IF NOT EXISTS vlr_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_pro_players_vlr_id ON public.pro_players(vlr_id);

-- 3. Asegurar que matches tenga índice único en vlr_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_matches_vlr_id ON public.matches(vlr_id);

-- 4. Restricción única para player_performances para evitar duplicados por mapa
-- Primero limpiamos duplicados si existen (opcional pero recomendado)
-- DELETE FROM public.player_performances a USING public.player_performances b 
-- WHERE a.id > b.id AND a.match_id = b.match_id AND a.player_id = b.player_id AND a.map_name = b.map_name;

ALTER TABLE public.player_performances DROP CONSTRAINT IF EXISTS player_performances_match_player_map_key;
ALTER TABLE public.player_performances ADD CONSTRAINT player_performances_match_player_map_key UNIQUE (match_id, player_id, map_name);

-- 6. Función para calcular puntos de Leyendas (Jugadores retirados)
-- Retorna el promedio de puntos del quinteto titular del equipo en ese partido multiplicado por 0.8
DROP FUNCTION IF EXISTS public.calculate_legend_points(match_id UUID, legend_id UUID);
CREATE OR REPLACE FUNCTION public.calculate_legend_points(match_id UUID, legend_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
    v_team_id UUID;
    v_avg_points NUMERIC;
BEGIN
    -- 1. Obtener el equipo de la leyenda
    SELECT team_id INTO v_team_id FROM pro_players WHERE id = legend_id;
    
    -- 2. Calcular promedio de puntos de los jugadores de ese equipo en ese partido
    SELECT AVG(fantasy_points) INTO v_avg_points
    FROM player_performances pp
    JOIN pro_players p ON p.id = pp.player_id
    WHERE pp.match_id = calculate_legend_points.match_id
      AND p.team_id = v_team_id;
      
    RETURN COALESCE(v_avg_points * 0.8, 0);
END;
$$;

-- 7. Comentarios de integridad
COMMENT ON COLUMN public.pro_players.vlr_id IS 'ID persistente de VLR.gg para evitar duplicados por cambio de nickname';
COMMENT ON COLUMN public.pro_teams.vlr_id IS 'ID persistente de VLR.gg para evitar duplicados por cambio de nombre';
