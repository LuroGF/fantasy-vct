-- ============================================
-- FANTASY VCT - COMPLETE IDEMPOTENT SCHEMA
-- ============================================
-- This script safely creates or updates the database schema.
-- It can be run multiple times without data loss.

-- 0. Set up Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

-- 1. BASE TABLES
-- ============================================

-- Profiles: Links to Auth.Users
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  avatar_url text NULL,
  global_points integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Pro Teams
CREATE TABLE IF NOT EXISTS public.pro_teams (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  tag text NOT NULL UNIQUE,
  logo_url text NULL,
  region text NULL
);

-- Pro Players
CREATE TABLE IF NOT EXISTS public.pro_players (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  nickname text NOT NULL UNIQUE,
  full_name text NULL,
  team_id uuid REFERENCES public.pro_teams(id) ON DELETE SET NULL,
  role text NULL,
  market_value bigint DEFAULT 10000000,
  photo_url text NULL,
  CONSTRAINT pro_players_role_check CHECK (role IN ('Duelista', 'Iniciador', 'Controlador', 'Centinela'))
);

-- Gameweeks
CREATE TABLE IF NOT EXISTS public.gameweeks (
  id serial NOT NULL PRIMARY KEY,
  name text NOT NULL,
  start_date timestamp with time zone NOT NULL UNIQUE,
  end_date timestamp with time zone NOT NULL,
  is_active boolean DEFAULT false,
  is_locked boolean DEFAULT false
);

-- Leagues
CREATE TABLE IF NOT EXISTS public.leagues (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  invite_code text UNIQUE,
  creator_id uuid REFERENCES public.profiles(id),
  is_public boolean DEFAULT true,
  max_participants integer DEFAULT 10,
  budget_limit bigint DEFAULT 100000000,
  created_at timestamp with time zone DEFAULT now()
);

-- League Participants
CREATE TABLE IF NOT EXISTS public.league_participants (
  league_id uuid NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_budget bigint NULL,
  total_points integer DEFAULT 0,
  transfers_made_this_week integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (league_id, profile_id)
);

-- User Rosters
CREATE TABLE IF NOT EXISTS public.user_rosters (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  league_id uuid REFERENCES public.leagues(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  player_id uuid REFERENCES public.pro_players(id) ON DELETE CASCADE,
  acquisition_price bigint NOT NULL,
  is_active boolean DEFAULT true,
  is_starter boolean DEFAULT false,
  release_clause bigint NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_rosters_league_profile_player_unique UNIQUE (league_id, profile_id, player_id)
);

-- Matches
CREATE TABLE IF NOT EXISTS public.matches (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  vlr_id text UNIQUE,
  team_a uuid REFERENCES public.pro_teams(id),
  team_b uuid REFERENCES public.pro_teams(id),
  match_date timestamp with time zone NULL,
  status text DEFAULT 'upcoming',
  gameweek_id integer REFERENCES public.gameweeks(id),
  created_at timestamp with time zone DEFAULT now()
);

-- Player Performances
CREATE TABLE IF NOT EXISTS public.player_performances (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  match_id uuid REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id uuid REFERENCES public.pro_players(id) ON DELETE CASCADE,
  kills integer DEFAULT 0,
  deaths integer DEFAULT 0,
  assists integer DEFAULT 0,
  clutches integer DEFAULT 0,
  fb integer DEFAULT 0,
  fd integer DEFAULT 0,
  acs integer DEFAULT 0,
  mvp boolean DEFAULT false,
  fantasy_points integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT player_performances_match_player_unique UNIQUE (match_id, player_id)
);

-- Participant Scores History
CREATE TABLE IF NOT EXISTS public.participant_scores_history (
  league_id uuid REFERENCES public.leagues(id),
  profile_id uuid REFERENCES public.profiles(id),
  gameweek_id integer REFERENCES public.gameweeks(id),
  points_earned integer DEFAULT 0,
  rank_in_league integer NULL,
  PRIMARY KEY (league_id, profile_id, gameweek_id)
);

-- Powerup Types
CREATE TABLE IF NOT EXISTS public.powerup_types (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL,
  base_price bigint DEFAULT 5000000,
  icon text NULL
);

-- Active Powerups
CREATE TABLE IF NOT EXISTS public.active_powerups (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  league_id uuid NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  gameweek_id integer NOT NULL REFERENCES public.gameweeks(id) ON DELETE CASCADE,
  powerup_type_id uuid NOT NULL REFERENCES public.powerup_types(id) ON DELETE CASCADE,
  target_player_id uuid REFERENCES public.pro_players(id) ON DELETE SET NULL,
  activated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT one_powerup_per_gameweek UNIQUE (league_id, profile_id, gameweek_id)
);

-- User Inventory
CREATE TABLE IF NOT EXISTS public.user_inventory (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  league_id uuid NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  powerup_type_id uuid NOT NULL REFERENCES public.powerup_types(id) ON DELETE CASCADE,
  quantity integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_inventory_league_profile_type_unique UNIQUE (league_id, profile_id, powerup_type_id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  league_id uuid REFERENCES public.leagues(id) ON DELETE SET NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Market Transactions
CREATE TABLE IF NOT EXISTS public.market_transactions (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  league_id uuid REFERENCES public.leagues(id),
  profile_id uuid REFERENCES public.profiles(id),
  player_id uuid REFERENCES public.pro_players(id),
  type text CHECK (type IN ('buy', 'sell', 'clause_paid', 'buy_item')),
  price bigint NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Push Subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- 2. AUTOMATION: FUNCTIONS & TRIGGERS
-- ============================================

-- Profile Creation Trigger (Crucial for new signups)
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'username', 'Manager_' || substr(new.id::text, 1, 5)), new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create trigger safely
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Fantasy Points Calculation
CREATE OR REPLACE FUNCTION public.calculate_fantasy_points() RETURNS trigger AS $$
DECLARE
    final_role text;
    points integer := 0;
BEGIN
    -- Priority: 
    -- 1. Agent Role from performance (scraped for the specific match)
    -- 2. Player Role from pro_players (fallback)
    
    IF NEW.agent_role IS NOT NULL AND NEW.agent_role != '' THEN
        final_role := NEW.agent_role;
    ELSE
        SELECT role INTO final_role FROM public.pro_players WHERE id = NEW.player_id;
    END IF;

    -- Scoring logic by role
    IF final_role = 'Duelista' THEN
        points := floor(NEW.kills * 1 + NEW.assists * 0.5 + NEW.fb * 5 + NEW.fd * -3 + NEW.deaths * -1);
        IF NEW.kills >= 45 THEN points := points + 10; END IF;
        IF NEW.mvp THEN points := points + 10; END IF; -- Buffed MVP for duelists
    ELSIF final_role = 'Centinela' THEN
        points := floor(NEW.kills * 2 + NEW.assists * 0.5 + NEW.fb * 6 + NEW.fd * -4 + NEW.deaths * -1);
        IF NEW.mvp THEN points := points + 5; END IF;
    ELSIF final_role = 'Iniciador' OR final_role = 'Controlador' THEN
        points := floor(NEW.kills * 1.5 + NEW.assists * 2 + NEW.fb * 3 + NEW.fd * -2 + NEW.deaths * -1);
        -- Bonus for 20+ assists
        IF NEW.assists >= 20 THEN points := points + 10; END IF;
        IF NEW.mvp THEN points := points + 5; END IF;
    ELSE
        -- Default/Flex fallback if no specific role detected
        points := floor(NEW.kills * 2 + NEW.assists * 1 + NEW.fb * 3 + NEW.clutches * 4);
        IF NEW.kills < NEW.deaths THEN points := points - 1; END IF;
    END IF;

    NEW.fantasy_points := points;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_calculate_points ON public.player_performances;
CREATE TRIGGER tr_calculate_points
BEFORE INSERT OR UPDATE ON public.player_performances
FOR EACH ROW EXECUTE FUNCTION public.calculate_fantasy_points();

-- 3. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS everywhere
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pro_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pro_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gameweeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_performances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participant_scores_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.powerup_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_powerups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- CLEANUP OLD POLICIES
DO $$ 
DECLARE 
    pol RECORD;
BEGIN 
    FOR pol IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- 3.1 Profiles
CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can edit own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 3.2 Leagues
CREATE POLICY "Anyone can create leagues" ON public.leagues FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Anyone can view leagues" ON public.leagues FOR SELECT USING (true);
CREATE POLICY "Creators can edit leagues" ON public.leagues FOR UPDATE USING (auth.uid() = creator_id);

-- 3.3 League Participants
CREATE POLICY "Anyone can join leagues" ON public.league_participants FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Participants are public" ON public.league_participants FOR SELECT USING (true);
CREATE POLICY "Users can edit own participation" ON public.league_participants FOR UPDATE USING (auth.uid() = profile_id);

-- 3.4 General Data (Public Read)
CREATE POLICY "Public read players" ON public.pro_players FOR SELECT USING (true);
CREATE POLICY "Public read teams" ON public.pro_teams FOR SELECT USING (true);
CREATE POLICY "Public read matches" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Public read gameweeks" ON public.gameweeks FOR SELECT USING (true);
CREATE POLICY "Public read performances" ON public.player_performances FOR SELECT USING (true);
CREATE POLICY "Public read powerups" ON public.powerup_types FOR SELECT USING (true);

-- 3.5 Rosters
CREATE POLICY "Public read rosters" ON public.user_rosters FOR SELECT USING (true);
CREATE POLICY "Users can manage own rosters" ON public.user_rosters FOR ALL USING (auth.uid() = profile_id);

-- 3.6 Inventory & Powerups
CREATE POLICY "Users can view own inventory" ON public.user_inventory FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "Users can manage own inventory" ON public.user_inventory FOR ALL USING (auth.uid() = profile_id);
CREATE POLICY "Users can view active powerups" ON public.active_powerups FOR SELECT USING (true);
CREATE POLICY "Users can use powerups" ON public.active_powerups FOR INSERT WITH CHECK (auth.uid() = profile_id);

-- 3.7 Transactions & Notifications
CREATE POLICY "Users can view own transactions" ON public.market_transactions FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "Users can insert own transactions" ON public.market_transactions FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "Users can manage own notifications" ON public.notifications FOR ALL USING (auth.uid() = profile_id);

-- 3.8 Push Subscriptions
CREATE POLICY "Users can manage own subscriptions" ON public.push_subscriptions FOR ALL USING (auth.uid() = user_id);

-- 4. SEED DATA
-- ============================================

INSERT INTO public.powerup_types (code, name, description, base_price, icon) VALUES
('LOCK', 'El Candado', 'Protege a un jugador de ser robado por cláusula durante esta jornada.', 3000, '🛡️'),
('MONEY', 'Inversor', 'Recibe 5M de presupuesto extra inmediatamente.', 5000, '💰'),
('CAPTAIN', 'Capitán', 'El jugador seleccionado puntuará DOBLE en esta jornada.', 4000, '©️')
ON CONFLICT (code) DO UPDATE SET 
    base_price = EXCLUDED.base_price,
    description = EXCLUDED.description,
    name = EXCLUDED.name,
    icon = EXCLUDED.icon;

-- 6. BACKFILL EXISTING USERS
-- ============================================
INSERT INTO public.profiles (id, username)
SELECT id, COALESCE(raw_user_meta_data->>'username', 'Manager_' || substr(id::text, 1, 5))
FROM auth.users
ON CONFLICT (id) DO NOTHING;
DO $$ 
BEGIN 
    -- user_rosters
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_rosters' AND column_name='is_starter') THEN
        ALTER TABLE public.user_rosters ADD COLUMN is_starter boolean NOT NULL DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_rosters' AND column_name='release_clause') THEN
        ALTER TABLE public.user_rosters ADD COLUMN release_clause bigint NULL;
    END IF;

    -- league_participants
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='league_participants' AND column_name='transfers_made_this_week') THEN
        ALTER TABLE public.league_participants ADD COLUMN transfers_made_this_week integer DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='league_participants' AND column_name='total_points') THEN
        ALTER TABLE public.league_participants ADD COLUMN total_points integer DEFAULT 0;
    END IF;

    -- profiles
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='global_points') THEN
        ALTER TABLE public.profiles ADD COLUMN global_points integer DEFAULT 0;
    END IF;

    -- Update market_transactions types
    ALTER TABLE public.market_transactions DROP CONSTRAINT IF EXISTS market_transactions_type_check;
    ALTER TABLE public.market_transactions ADD CONSTRAINT market_transactions_type_check CHECK (type IN ('buy', 'sell', 'clause_paid', 'buy_item'));
END $$;
