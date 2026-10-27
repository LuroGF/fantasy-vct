-- Least-privilege table perimeter for the V1.
-- RLS remains enabled; grants decide which operations reach RLS at all.

begin;

-- The profile UI already uses these optional customization fields, but the
-- live database predates profile_customization.sql. Create only the missing
-- columns before applying column-level grants.
alter table public.profiles
  add column if not exists bio text,
  add column if not exists banner_color text default '#ff4655',
  add column if not exists fav_team_id uuid references public.pro_teams(id) on delete set null,
  add column if not exists title text default 'Entrenador novato';

alter default privileges for role postgres in schema public
  revoke all on tables from public, anon, authenticated;
alter default privileges for role postgres in schema public
  grant all on tables to service_role;

revoke all on all tables in schema public from public, anon, authenticated;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- Authenticated read surface used by server-rendered application pages.
grant select on table
  public.daily_bonus_claims,
  public.daily_bonus_credits,
  public.gameweek_lineups,
  public.gameweek_rewards,
  public.gameweeks,
  public.league_offers,
  public.league_participants,
  public.league_reports,
  public.leagues,
  public.manager_offers,
  public.market_auctions,
  public.market_cycles,
  public.market_transactions,
  public.matches,
  public.notification_preferences,
  public.notifications,
  public.participant_scores_history,
  public.player_listings,
  public.player_performances,
  public.pro_players,
  public.pro_teams,
  public.profiles,
  public.user_bids,
  public.user_rosters,
  public.vct_season_players,
  public.vct_season_teams,
  public.vct_seasons
to authenticated;

-- The profile action exposes an explicit allow-list; mirror it in PostgreSQL
-- so a direct Data API request cannot change points or protected fields.
grant update (username, bio, banner_color, fav_team_id, title)
  on public.profiles to authenticated;

-- Users may only change the read state of their own notifications.
grant update (is_read, read_at)
  on public.notifications to authenticated;

-- Users own their preference row. RLS enforces profile_id = auth.uid(), while
-- column grants prevent extra fields from being introduced by a direct call.
grant insert (
  profile_id,
  push_enabled,
  market_enabled,
  gameweek_enabled,
  social_enabled,
  daily_reward_enabled,
  updated_at
) on public.notification_preferences to authenticated;
grant update (
  profile_id,
  push_enabled,
  market_enabled,
  gameweek_enabled,
  social_enabled,
  daily_reward_enabled,
  updated_at
) on public.notification_preferences to authenticated;

-- League membership, budgets, rosters and league ownership are mutated only
-- through the validated SECURITY DEFINER RPCs.
drop policy if exists participant_self_delete on public.league_participants;
drop policy if exists participant_self_insert on public.league_participants;
drop policy if exists participant_self_update on public.league_participants;
drop policy if exists roster_self_delete on public.user_rosters;
drop policy if exists roster_self_insert on public.user_rosters;
drop policy if exists roster_self_update on public.user_rosters;
drop policy if exists league_authenticated_create on public.leagues;
drop policy if exists league_creator_delete on public.leagues;
drop policy if exists league_creator_update on public.leagues;

-- Private league data is visible only to members of that league.
drop policy if exists participants_public_read on public.league_participants;
create policy participants_league_members_read
  on public.league_participants
  for select
  to authenticated
  using (public.is_league_member(league_id));

drop policy if exists leagues_public_read on public.leagues;
create policy leagues_members_read
  on public.leagues
  for select
  to authenticated
  using (public.is_league_member(id));

drop policy if exists rosters_public_read on public.user_rosters;
create policy rosters_league_members_read
  on public.user_rosters
  for select
  to authenticated
  using (public.is_league_member(league_id));

drop policy if exists scores_public_read on public.participant_scores_history;
create policy scores_league_members_read
  on public.participant_scores_history
  for select
  to authenticated
  using (public.is_league_member(league_id));

commit;
