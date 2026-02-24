-- ============================================
-- MARKET HISTORY & ROLE REFINEMENT
-- ============================================

-- 1. Update pro_players role constraint to including 'Flex'
ALTER TABLE public.pro_players DROP CONSTRAINT IF EXISTS pro_players_role_check;
ALTER TABLE public.pro_players ADD CONSTRAINT pro_players_role_check 
CHECK (role IN ('Duelista', 'Iniciador', 'Controlador', 'Centinela', 'Flex'));

-- 2. Create Player Value History Table
CREATE TABLE IF NOT EXISTS public.player_value_history (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    player_id UUID REFERENCES public.pro_players(id) ON DELETE CASCADE,
    old_value BIGINT NOT NULL,
    new_value BIGINT NOT NULL,
    gameweek_id INTEGER REFERENCES public.gameweeks(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Index for performance
CREATE INDEX IF NOT EXISTS idx_player_value_history_player ON public.player_value_history(player_id);
CREATE INDEX IF NOT EXISTS idx_player_value_history_created ON public.player_value_history(created_at);

-- 4. Enable RLS
ALTER TABLE public.player_value_history ENABLE ROW LEVEL SECURITY;

-- 5. Policies
DROP POLICY IF EXISTS "Public read history" ON public.player_value_history;
CREATE POLICY "Public read history" ON public.player_value_history FOR SELECT USING (true);
