-- Fix RLS Policies for Score Syncing
-- Este script añade las políticas faltantes para permitir que el cron job (service_role) 
-- pueda insertar y actualizar datos en las tablas necesarias

-- ============================================
-- PLAYER_PERFORMANCES - Permitir INSERT/UPDATE para service role
-- ============================================

-- Permitir INSERT a cualquiera (el service_role siempre puede, pero esto es para claridad)
CREATE POLICY "Allow service role insert performances" 
ON public.player_performances 
FOR INSERT 
WITH CHECK (true);

-- Permitir UPDATE a cualquiera (el service_role siempre puede)
CREATE POLICY "Allow service role update performances" 
ON public.player_performances 
FOR UPDATE 
USING (true);

-- ============================================
-- PRO_PLAYERS - Permitir INSERT para crear jugadores automáticamente
-- ============================================

CREATE POLICY "Allow service role insert players" 
ON public.pro_players 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow service role update players" 
ON public.pro_players 
FOR UPDATE 
USING (true);

-- ============================================
-- PRO_TEAMS - Permitir INSERT para crear equipos automáticamente
-- ============================================

CREATE POLICY "Allow service role insert teams" 
ON public.pro_teams 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow service role update teams" 
ON public.pro_teams 
FOR UPDATE 
USING (true);

-- ============================================
-- MATCHES - Permitir UPDATE para cambiar status a 'finished'
-- ============================================

CREATE POLICY "Allow service role update matches" 
ON public.matches 
FOR UPDATE 
USING (true);

-- ============================================
-- GAMEWEEKS - Permitir UPDATE para activar/desactivar jornadas
-- ============================================

CREATE POLICY "Allow service role update gameweeks" 
ON public.gameweeks 
FOR UPDATE 
USING (true);

-- ============================================
-- PARTICIPANT_SCORES_HISTORY - Permitir lectura y escritura de puntuaciones
-- ============================================

-- Habilitar RLS si no está habilitado
ALTER TABLE public.participant_scores_history ENABLE ROW LEVEL SECURITY;

-- Permitir lectura pública de puntuaciones
CREATE POLICY "Public read scores history" 
ON public.participant_scores_history 
FOR SELECT 
USING (true);

-- Permitir INSERT para guardar puntuaciones
CREATE POLICY "Allow insert scores history" 
ON public.participant_scores_history 
FOR INSERT 
WITH CHECK (true);

-- Permitir UPDATE para actualizar rankings
CREATE POLICY "Allow update scores history" 
ON public.participant_scores_history 
FOR UPDATE 
USING (true);
