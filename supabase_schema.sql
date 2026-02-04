-- Tabla de Perfiles (Esquema Real)
create table public.profiles (
  id uuid not null,
  username text null,
  avatar_url text null,
  global_points integer null default 0,
  created_at timestamp with time zone null default now(),
  constraint profiles_pkey primary key (id),
  constraint profiles_username_key unique (username),
  constraint profiles_id_fkey foreign KEY (id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

-- Tabla de Ligas (Esquema Real)
create table public.leagues (
  id uuid not null default extensions.uuid_generate_v4 (),
  name text not null,
  invite_code text null,
  creator_id uuid null,
  is_public boolean null default true,
  max_participants integer null default 10,
  budget_limit bigint null default 100000000,
  created_at timestamp with time zone null default now(),
  constraint leagues_pkey primary key (id),
  constraint leagues_invite_code_key unique (invite_code),
  constraint leagues_creator_id_fkey foreign KEY (creator_id) references profiles (id)
) TABLESPACE pg_default;

-- Tabla de Participantes (Esquema Real)
create table public.league_participants (
  league_id uuid not null,
  profile_id uuid not null,
  current_budget bigint null,
  total_points integer null default 0,
  constraint league_participants_pkey primary key (league_id, profile_id),
  constraint league_participants_league_id_fkey foreign KEY (league_id) references leagues (id) on delete CASCADE,
  constraint league_participants_profile_id_fkey foreign KEY (profile_id) references profiles (id) on delete CASCADE
) TABLESPACE pg_default;

-- Tabla de Partidos (Esquema Real)
create table public.matches (
  id uuid not null default extensions.uuid_generate_v4 (),
  vlr_id text null,
  team_a uuid null,
  team_b uuid null,
  match_date timestamp with time zone null,
  status text null default 'upcoming'::text,
  gameweek_id integer null,
  constraint matches_pkey primary key (id),
  constraint matches_vlr_id_key unique (vlr_id),
  constraint matches_team_a_fkey foreign KEY (team_a) references pro_teams (id),
  constraint matches_team_b_fkey foreign KEY (team_b) references pro_teams (id)
) TABLESPACE pg_default;

-- Tabla de Transacciones de Mercado (Esquema Real)
create table public.market_transactions (
  id uuid not null default extensions.uuid_generate_v4 (),
  league_id uuid null,
  profile_id uuid null,
  player_id uuid null,
  type text null,
  price bigint not null,
  created_at timestamp with time zone null default now(),
  constraint market_transactions_pkey primary key (id),
  constraint market_transactions_league_id_fkey foreign KEY (league_id) references leagues (id),
  constraint market_transactions_player_id_fkey foreign KEY (player_id) references pro_players (id),
  constraint market_transactions_profile_id_fkey foreign KEY (profile_id) references profiles (id),
  constraint market_transactions_type_check check ((type = any (array['buy'::text, 'sell'::text])))
) TABLESPACE pg_default;

-- Tabla de Plantillas/Rosters (Esquema Real)
create table public.user_rosters (
  id uuid not null default extensions.uuid_generate_v4 (),
  league_id uuid null,
  profile_id uuid null,
  player_id uuid null,
  acquisition_price bigint not null,
  is_active boolean null default true,
  constraint user_rosters_pkey primary key (id),
  constraint user_rosters_league_id_profile_id_player_id_key unique (league_id, profile_id, player_id),
  constraint user_rosters_league_id_fkey foreign KEY (league_id) references leagues (id) on delete CASCADE,
  constraint user_rosters_player_id_fkey foreign KEY (player_id) references pro_players (id) on delete CASCADE,
  constraint user_rosters_profile_id_fkey foreign KEY (profile_id) references profiles (id) on delete CASCADE
) TABLESPACE pg_default;

-- Tabla de Jornadas (Esquema Real)
create table public.gameweeks (
  id serial not null,
  name text not null,
  start_date timestamp with time zone not null,
  end_date timestamp with time zone not null,
  is_active boolean null default false,
  is_locked boolean null default false,
  constraint gameweeks_pkey primary key (id)
) TABLESPACE pg_default;

-- Tabla de Rendimiento de Jugadores (Esquema Real)
create table public.player_performances (
  id uuid not null default extensions.uuid_generate_v4 (),
  match_id uuid null,
  player_id uuid null,
  kills integer null default 0,
  deaths integer null default 0,
  assists integer null default 0,
  clutches integer null default 0,
  fb integer null default 0,
  fantasy_points integer null default 0,
  constraint player_performances_pkey primary key (id),
  constraint player_performances_match_id_player_id_key unique (match_id, player_id),
  constraint player_performances_match_id_fkey foreign KEY (match_id) references matches (id) on delete CASCADE,
  constraint player_performances_player_id_fkey foreign KEY (player_id) references pro_players (id) on delete CASCADE
) TABLESPACE pg_default;

-- Trigger para cálculo automático de puntos (Sugerido)
-- create trigger tr_calculate_points BEFORE INSERT or update on player_performances 
-- for EACH row execute FUNCTION calculate_fantasy_points ();

-- Tabla de Historia de Puntuaciones (Esquema Real)
create table public.participant_scores_history (
  league_id uuid not null,
  profile_id uuid not null,
  gameweek_id integer not null,
  points_earned integer null default 0,
  rank_in_league integer null,
  constraint participant_scores_history_pkey primary key (league_id, profile_id, gameweek_id),
  constraint participant_scores_history_gameweek_id_fkey foreign KEY (gameweek_id) references gameweeks (id),
  constraint participant_scores_history_league_id_fkey foreign KEY (league_id) references leagues (id),
  constraint participant_scores_history_profile_id_fkey foreign KEY (profile_id) references profiles (id)
) TABLESPACE pg_default;
