-- ============================================
-- FANTASY VCT - IDEMPOTENT DATABASE SCHEMA
-- ============================================
-- This script can be run multiple times safely.
-- It will create missing tables and columns without affecting existing data.

-- 0. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

-- 1. Profiles (Must exist before leagues/rosters)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL PRIMARY KEY,
  username text UNIQUE,
  avatar_url text NULL,
  global_points integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  constraint profiles_id_fkey foreign KEY (id) references auth.users (id) on delete CASCADE
);

-- 2. Pro Teams
CREATE TABLE IF NOT EXISTS public.pro_teams (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  tag text NOT NULL UNIQUE,
  logo_url text NULL,
  region text NULL
);

-- 3. Pro Players
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

-- 4. Gameweeks
CREATE TABLE IF NOT EXISTS public.gameweeks (
  id serial NOT NULL PRIMARY KEY,
  name text NOT NULL,
  start_date timestamp with time zone NOT NULL UNIQUE,
  end_date timestamp with time zone NOT NULL,
  is_active boolean DEFAULT false,
  is_locked boolean DEFAULT false
);

-- 5. Leagues
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

-- 6. League Participants
CREATE TABLE IF NOT EXISTS public.league_participants (
  league_id uuid NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_budget bigint NULL,
  total_points integer DEFAULT 0,
  transfers_made_this_week integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (league_id, profile_id)
);

-- 7. User Rosters
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

-- 8. Matches
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

-- 9. Player Performances
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

-- 10. Participant Scores History
CREATE TABLE IF NOT EXISTS public.participant_scores_history (
  league_id uuid REFERENCES public.leagues(id),
  profile_id uuid REFERENCES public.profiles(id),
  gameweek_id integer REFERENCES public.gameweeks(id),
  points_earned integer DEFAULT 0,
  rank_in_league integer NULL,
  PRIMARY KEY (league_id, profile_id, gameweek_id)
);

-- 11. Powerup Types
CREATE TABLE IF NOT EXISTS public.powerup_types (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL,
  base_price bigint DEFAULT 5000000,
  icon text NULL
);

-- 12. Active Powerups
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

-- 13. User Inventory
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

-- 14. Notifications
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

-- 15. Market Transactions
CREATE TABLE IF NOT EXISTS public.market_transactions (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  league_id uuid REFERENCES public.leagues(id),
  profile_id uuid REFERENCES public.profiles(id),
  player_id uuid REFERENCES public.pro_players(id),
  type text CHECK (type IN ('buy', 'sell', 'clause_paid', 'buy_item')),
  price bigint NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- 16. Push Subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- ============================================
-- 2. ENSURE MISSING COLUMNS (MIGRATIONS)
-- ============================================

DO $$ 
BEGIN 
    -- user_rosters columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_rosters' AND column_name='is_starter') THEN
        ALTER TABLE public.user_rosters ADD COLUMN is_starter boolean NOT NULL DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_rosters' AND column_name='release_clause') THEN
        ALTER TABLE public.user_rosters ADD COLUMN release_clause bigint NULL;
    END IF;

    -- league_participants columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='league_participants' AND column_name='transfers_made_this_week') THEN
        ALTER TABLE public.league_participants ADD COLUMN transfers_made_this_week integer DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='league_participants' AND column_name='total_points') THEN
        ALTER TABLE public.league_participants ADD COLUMN total_points integer DEFAULT 0;
    END IF;

    -- profiles columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='global_points') THEN
        ALTER TABLE public.profiles ADD COLUMN global_points integer DEFAULT 0;
    END IF;

    -- market_transactions check constraint update
    ALTER TABLE public.market_transactions DROP CONSTRAINT IF EXISTS market_transactions_type_check;
    ALTER TABLE public.market_transactions ADD CONSTRAINT market_transactions_type_check CHECK (type IN ('buy', 'sell', 'clause_paid', 'buy_item'));
END $$;

-- ============================================
-- 3. FUNCTIONS & TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION public.calculate_fantasy_points() RETURNS trigger AS $$
DECLARE
    player_role text;
    points integer := 0;
BEGIN
    -- Obtener rol del jugador
    SELECT role INTO player_role FROM public.pro_players WHERE id = NEW.player_id;

    -- Lógica por rol (Sincronizada con lib/vlr.ts)
    IF player_role = 'Duelista' THEN
        points := floor(NEW.kills * 1 + NEW.assists * 0.5 + NEW.fb * 5 + NEW.fd * -3 + NEW.deaths * -1);
        IF NEW.kills >= 45 THEN points := points + 10; END IF;
        IF NEW.mvp THEN points := points + 5; END IF;
    ELSIF player_role = 'Centinela' THEN
        points := floor(NEW.kills * 2 + NEW.assists * 0.5 + NEW.fb * 6 + NEW.fd * -4 + NEW.deaths * -1);
        IF NEW.mvp THEN points := points + 5; END IF;
    ELSIF player_role = 'Iniciador' OR player_role = 'Controlador' THEN
        points := floor(NEW.kills * 1.5 + NEW.assists * 2 + NEW.fb * 3 + NEW.fd * -2 + NEW.deaths * -1);
        IF NEW.assists >= 20 THEN points := points + 10; ELSE points := points - 5; END IF;
        IF NEW.mvp THEN points := points + 5; END IF;
    ELSE
        -- Fallback si no tiene rol o es genérico
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
