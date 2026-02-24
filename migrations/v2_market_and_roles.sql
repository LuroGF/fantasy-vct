-- ============================================
-- MARKET HISTORY & ROLE REFINEMENT
-- ============================================

-- 1. Update pro_players role constraint to including 'Flex'
ALTER TABLE public.pro_players DROP CONSTRAINT IF EXISTS pro_players_role_check;
ALTER TABLE public.pro_players ADD CONSTRAINT pro_players_role_check 
CHECK (role IN ('Duelista', 'Iniciador', 'Controlador', 'Centinela', 'Flex'));

-- 2. Expand market_transactions types to include trades and auctions
ALTER TABLE public.market_transactions DROP CONSTRAINT IF EXISTS market_transactions_type_check;
ALTER TABLE public.market_transactions ADD CONSTRAINT market_transactions_type_check 
CHECK (type IN ('buy', 'sell', 'clause_paid', 'buy_item', 'trade', 'auction_sold'));

-- 3. Create Player Value History Table
CREATE TABLE IF NOT EXISTS public.player_value_history (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    player_id UUID REFERENCES public.pro_players(id) ON DELETE CASCADE,
    old_value BIGINT NOT NULL,
    new_value BIGINT NOT NULL,
    gameweek_id INTEGER REFERENCES public.gameweeks(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Index for performance
CREATE INDEX IF NOT EXISTS idx_player_value_history_player ON public.player_value_history(player_id);
CREATE INDEX IF NOT EXISTS idx_player_value_history_created ON public.player_value_history(created_at);

-- 5. Enable RLS
ALTER TABLE public.player_value_history ENABLE ROW LEVEL SECURITY;

-- 6. Policies
DROP POLICY IF EXISTS "Public read history" ON public.player_value_history;
CREATE POLICY "Public read history" ON public.player_value_history FOR SELECT USING (true);
