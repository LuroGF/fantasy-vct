-- ============================================
-- MARKET OVERHAUL & TEAM STRUCTURE UPDATE
-- ============================================

-- 1. Personal Market (4 Daily Random Players)
CREATE TABLE IF NOT EXISTS public.personal_market (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  league_id uuid NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.pro_players(id) ON DELETE CASCADE,
  offer_price bigint NOT NULL,
  is_purchased boolean DEFAULT false,
  created_at date DEFAULT CURRENT_DATE,
  UNIQUE (league_id, profile_id, player_id, created_at)
);

-- 2. Global Auctions (Puja)
CREATE TABLE IF NOT EXISTS public.market_auctions (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  league_id uuid NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.pro_players(id) ON DELETE CASCADE,
  starting_price bigint NOT NULL,
  current_bid bigint NOT NULL,
  highest_bidder_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  expires_at timestamp with time zone NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'sold', 'expired', 'canceled')),
  created_at timestamp with time zone DEFAULT now()
);

-- 3. Modify User Rosters for 4 substitute slots
-- We'll use a new column to distinguish Starters, Substitutes, and Bench
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_rosters' AND column_name='slot_type') THEN
        ALTER TABLE public.user_rosters ADD COLUMN slot_type text DEFAULT 'bench' CHECK (slot_type IN ('starter', 'substitute', 'bench'));
    END IF;

    -- Backfill existing data
    UPDATE public.user_rosters SET slot_type = 'starter' WHERE is_starter = true;
    UPDATE public.user_rosters SET slot_type = 'bench' WHERE is_starter = false;
END $$;

-- 4. RLS & Permissions
ALTER TABLE public.personal_market ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_auctions ENABLE ROW LEVEL SECURITY;

-- Personal Market Policies
CREATE POLICY "Users can only see their own personal market"
ON public.personal_market FOR SELECT
USING (auth.uid() = profile_id);

-- Global Auctions Policies
CREATE POLICY "Anyone in the league can see active auctions"
ON public.market_auctions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.league_participants 
  WHERE league_id = market_auctions.league_id 
  AND profile_id = auth.uid()
));

CREATE POLICY "Users can list their own players for auction"
ON public.market_auctions FOR INSERT
WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Users can bid on auctions"
ON public.market_auctions FOR UPDATE
USING (auth.uid() != seller_id AND status = 'active');

-- 5. Helper Function to generate Personal Market daily
CREATE OR REPLACE FUNCTION public.get_or_generate_personal_market(p_league_id uuid, p_profile_id uuid)
RETURNS SETOF public.personal_market AS $$
DECLARE
    v_count int;
BEGIN
    -- Check if already generated for today
    SELECT count(*) INTO v_count FROM public.personal_market 
    WHERE league_id = p_league_id AND profile_id = p_profile_id AND created_at = CURRENT_DATE;

    IF v_count = 0 THEN
        -- Generate 4 random players that are NOT already owned by ANYONE in the league
        INSERT INTO public.personal_market (league_id, profile_id, player_id, offer_price)
        SELECT p_league_id, p_profile_id, p.id, p.market_value
        FROM public.pro_players p
        WHERE NOT EXISTS (
            SELECT 1 FROM public.user_rosters ur 
            WHERE ur.league_id = p_league_id AND ur.player_id = p.id
        )
        ORDER BY random()
        LIMIT 4;
    END IF;

    RETURN QUERY SELECT * FROM public.personal_market 
    WHERE league_id = p_league_id AND profile_id = p_profile_id AND created_at = CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
