-- Least-privilege RPC perimeter.
-- 1. Removes PostgreSQL's implicit PUBLIC execution permission.
-- 2. Allows service_role to run internal/cron functions.
-- 3. Exposes only the RPCs used by authenticated V1 flows.

begin;

alter default privileges for role postgres in schema public
  revoke execute on functions from public;

revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on all functions in schema public to service_role;

-- Account-scoped rewards.
grant execute on function public.get_daily_bonus_status() to authenticated;
grant execute on function public.claim_daily_bonus() to authenticated;

-- VCT 2027 league lifecycle.
grant execute on function public.create_vct_2027_fantasy_league(text) to authenticated;
grant execute on function public.join_vct_2027_fantasy_league(text) to authenticated;
grant execute on function public.leave_fantasy_league(uuid) to authenticated;
grant execute on function public.kick_fantasy_league_member(uuid, uuid) to authenticated;
grant execute on function public.report_fantasy_league_member(uuid, uuid, text, text) to authenticated;
grant execute on function public.dismiss_fantasy_league_report(uuid) to authenticated;
grant execute on function public.is_league_member(uuid) to authenticated;

-- Line-up changes. The RPC validates auth.uid(), membership and ownership.
grant execute on function public.handle_set_starter_status(uuid, uuid, uuid, text) to authenticated;

-- Market actions. The live definitions have been audited: all reference
-- auth.uid() and fix search_path in addition to their business checks.
grant execute on function public.place_market_bid(uuid, bigint) to authenticated;
grant execute on function public.cancel_market_bid(uuid) to authenticated;
grant execute on function public.list_player_for_sale(uuid, bigint) to authenticated;
grant execute on function public.withdraw_player_listing(uuid) to authenticated;
grant execute on function public.update_player_listing_price(uuid, bigint) to authenticated;
grant execute on function public.make_manager_offer(uuid, bigint) to authenticated;
grant execute on function public.update_manager_offer(uuid, bigint) to authenticated;
grant execute on function public.accept_manager_offer(uuid) to authenticated;
grant execute on function public.reject_manager_offer(uuid) to authenticated;
grant execute on function public.accept_league_offer(uuid) to authenticated;
grant execute on function public.reject_league_offer(uuid) to authenticated;
grant execute on function public.pay_release_clause(uuid) to authenticated;

-- Intentionally not exposed:
-- * legacy create/join/initial-roster functions
-- * market/gameweek/notification engines
-- * reward settlement and VLR ingestion
-- * trigger/helper functions
-- * shop/power-up functions paused for V1
-- * handle_create_trade_offer: its legacy definition trusts caller-supplied
--   sender_id and must be replaced before authenticated can execute it.

commit;
