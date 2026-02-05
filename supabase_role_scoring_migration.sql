-- Migración: Añadir campos faltantes para sistema de puntuación por roles

-- 1. Añadir campo First Deaths (fd)
ALTER TABLE public.player_performances 
ADD COLUMN IF NOT EXISTS fd INTEGER DEFAULT 0;

-- 2. Añadir campo MVP
ALTER TABLE public.player_performances 
ADD COLUMN IF NOT EXISTS mvp BOOLEAN DEFAULT false;

-- 3. Actualizar función de cálculo de puntos
CREATE OR REPLACE FUNCTION calculate_fantasy_points()
RETURNS TRIGGER AS $$
DECLARE
  player_role TEXT;
  calculated_points DECIMAL;
BEGIN
  -- Obtener rol del jugador
  SELECT role INTO player_role
  FROM pro_players
  WHERE id = NEW.player_id;

  calculated_points := 0;

  CASE player_role
    -- DUELISTA
    WHEN 'Duelista' THEN
      calculated_points := calculated_points + (NEW.kills * 1);
      calculated_points := calculated_points + (NEW.assists * 0.5);
      calculated_points := calculated_points + (NEW.fb * 5);
      calculated_points := calculated_points + (COALESCE(NEW.fd, 0) * -3);
      calculated_points := calculated_points + (NEW.deaths * -1);
      -- Bonus 45+ kills
      IF NEW.kills >= 45 THEN 
        calculated_points := calculated_points + 10; 
      END IF;
      -- Bonus MVP
      IF COALESCE(NEW.mvp, false) = true THEN 
        calculated_points := calculated_points + 5; 
      END IF;

    -- CENTINELA
    WHEN 'Centinela' THEN
      calculated_points := calculated_points + (NEW.kills * 2);
      calculated_points := calculated_points + (NEW.assists * 0.5);
      calculated_points := calculated_points + (NEW.fb * 6);
      calculated_points := calculated_points + (COALESCE(NEW.fd, 0) * -4);
      calculated_points := calculated_points + (NEW.deaths * -1);
      -- Bonus MVP
      IF COALESCE(NEW.mvp, false) = true THEN 
        calculated_points := calculated_points + 5; 
      END IF;

    -- INICIADOR
    WHEN 'Iniciador' THEN
      calculated_points := calculated_points + (NEW.kills * 1.5);
      calculated_points := calculated_points + (NEW.assists * 2);
      calculated_points := calculated_points + (NEW.fb * 3);
      calculated_points := calculated_points + (COALESCE(NEW.fd, 0) * -2);
      calculated_points := calculated_points + (NEW.deaths * -1);
      -- Bonus/Penalización 20 assists
      IF NEW.assists >= 20 THEN 
        calculated_points := calculated_points + 10;
      ELSE
        calculated_points := calculated_points - 5;
      END IF;
      -- Bonus MVP
      IF COALESCE(NEW.mvp, false) = true THEN 
        calculated_points := calculated_points + 5; 
      END IF;

    -- CONTROLADOR (igual que Iniciador)
    WHEN 'Controlador' THEN
      calculated_points := calculated_points + (NEW.kills * 1.5);
      calculated_points := calculated_points + (NEW.assists * 2);
      calculated_points := calculated_points + (NEW.fb * 3);
      calculated_points := calculated_points + (COALESCE(NEW.fd, 0) * -2);
      calculated_points := calculated_points + (NEW.deaths * -1);
      -- Bonus/Penalización 20 assists
      IF NEW.assists >= 20 THEN 
        calculated_points := calculated_points + 10;
      ELSE
        calculated_points := calculated_points - 5;
      END IF;
      -- Bonus MVP
      IF COALESCE(NEW.mvp, false) = true THEN 
        calculated_points := calculated_points + 5; 
      END IF;
      
    -- DEFAULT (si no tiene rol asignado, usar sistema estándar)
    ELSE
      calculated_points := calculated_points + (NEW.kills * 2);
      calculated_points := calculated_points + (NEW.assists * 1);
      calculated_points := calculated_points + (NEW.fb * 3);
      calculated_points := calculated_points + (NEW.deaths * -1);
  END CASE;

  NEW.fantasy_points := ROUND(calculated_points);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Recrear trigger (por si acaso)
DROP TRIGGER IF EXISTS tr_calculate_points ON player_performances;
CREATE TRIGGER tr_calculate_points 
BEFORE INSERT OR UPDATE ON player_performances 
FOR EACH ROW 
EXECUTE FUNCTION calculate_fantasy_points();

-- 5. Comentarios para documentación
COMMENT ON COLUMN player_performances.fd IS 'First Deaths - número de primeras muertes en rondas';
COMMENT ON COLUMN player_performances.mvp IS 'MVP del partido - true si el jugador fue MVP';
