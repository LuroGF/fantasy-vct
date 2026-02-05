-- Migración: Sistema de Límite de Transferencias y Reset Semanal

-- 1. Añadir campo transfers_made_this_week a league_participants
ALTER TABLE public.league_participants 
ADD COLUMN IF NOT EXISTS transfers_made_this_week INTEGER DEFAULT 0;

-- 2. Función para resetear transferencias
CREATE OR REPLACE FUNCTION reset_weekly_transfers()
RETURNS TRIGGER AS $$
BEGIN
    -- Si la jornada se desbloquea (is_locked cambia de true a false)
    -- O si una nueva jornada se activa
    IF (OLD.is_locked = true AND NEW.is_locked = false) OR (OLD.is_active = false AND NEW.is_active = true) THEN
        UPDATE public.league_participants
        SET transfers_made_this_week = 0;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger en la tabla gameweeks
DROP TRIGGER IF EXISTS tr_reset_transfers ON public.gameweeks;
CREATE TRIGGER tr_reset_transfers
AFTER UPDATE ON public.gameweeks
FOR EACH ROW
EXECUTE FUNCTION reset_weekly_transfers();

COMMENT ON COLUMN public.league_participants.transfers_made_this_week IS 'Número de fichajes/ventas realizados en la jornada actual. Se resetea cuando la jornada se abre.';
