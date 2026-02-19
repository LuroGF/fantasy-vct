-- Migración: Añadir campo ACS para estadísticas y cálculo de MVP

-- 1. Añadir campo ACS
ALTER TABLE public.player_performances 
ADD COLUMN IF NOT EXISTS acs INTEGER DEFAULT 0;

COMMENT ON COLUMN public.player_performances.acs IS 'Average Combat Score - Usado para determinar el MVP (mayor ACS del partido)';
