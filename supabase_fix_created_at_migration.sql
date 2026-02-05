-- Migración: Añadir campos de auditoría created_at faltantes
-- Estos campos son necesarios para las consultas de ordenación en market-dynamics y player-stats

-- 1. Añadir created_at a player_performances
ALTER TABLE public.player_performances 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Añadir created_at a matches (opcional pero recomendado para consistencia)
ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. Añadir created_at a user_rosters (otros archivos también podrían necesitarlo)
ALTER TABLE public.user_rosters 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
