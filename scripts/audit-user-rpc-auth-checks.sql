-- Comprobación de las RPC que la V1 necesita exponer a authenticated.
-- Devuelve indicadores; no modifica nada.

with user_rpc_names(name) as (
  values
    ('get_daily_bonus_status'),
    ('claim_daily_bonus'),
    ('create_vct_2027_fantasy_league'),
    ('join_vct_2027_fantasy_league'),
    ('leave_fantasy_league'),
    ('kick_fantasy_league_member'),
    ('report_fantasy_league_member'),
    ('dismiss_fantasy_league_report'),
    ('is_league_member'),
    ('handle_set_starter_status'),
    ('place_market_bid'),
    ('cancel_market_bid'),
    ('list_player_for_sale'),
    ('withdraw_player_listing'),
    ('update_player_listing_price'),
    ('make_manager_offer'),
    ('update_manager_offer'),
    ('accept_manager_offer'),
    ('reject_manager_offer'),
    ('accept_league_offer'),
    ('reject_league_offer'),
    ('pay_release_clause')
)
select
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef as security_definer,
  position('auth.uid' in lower(pg_get_functiondef(p.oid))) > 0 as references_auth_uid,
  position('search_path' in lower(pg_get_functiondef(p.oid))) > 0 as fixes_search_path,
  case
    when not p.prosecdef then 'invoker'
    when position('auth.uid' in lower(pg_get_functiondef(p.oid))) = 0
      then 'REVIEW: security definer without auth.uid reference'
    else 'auth reference present'
  end as audit_note
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
join user_rpc_names u on u.name = p.proname
where n.nspname = 'public'
order by p.proname, arguments;
