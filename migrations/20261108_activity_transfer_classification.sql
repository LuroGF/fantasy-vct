begin;

-- Compatibility patch for databases where market_transactions.type is limited
-- to legacy values. Transfers are classified from the roster movement itself,
-- so activity tracking does not depend on adding a synthetic transaction type.
alter table public.league_activity_transfer_buffer
  add column if not exists from_release_clause bigint;

create or replace function public.activity_capture_roster_departure()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if coalesce(old.is_active, true) then
    insert into public.league_activity_transfer_buffer (
      source_txid, league_id, player_id, from_profile_id, from_release_clause
    ) values (
      txid_current(), old.league_id, old.player_id, old.profile_id, old.release_clause
    ) on conflict (source_txid, league_id, player_id, from_profile_id)
      do update set from_release_clause = excluded.from_release_clause;
  end if;
  return old;
end;
$$;

create or replace function public.activity_log_roster_arrival()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_from_profile_id uuid;
  v_from_release_clause bigint;
  v_event_type text;
begin
  select from_profile_id, from_release_clause
  into v_from_profile_id, v_from_release_clause
  from public.league_activity_transfer_buffer
  where source_txid = txid_current()
    and league_id = new.league_id
    and player_id = new.player_id
    and from_profile_id is distinct from new.profile_id
  order by created_at desc
  limit 1;

  if v_from_profile_id is not null then
    v_event_type := case
      when v_from_release_clause is not null
        and v_from_release_clause > 0
        and new.acquisition_price = v_from_release_clause
      then 'release_clause'
      else 'player_transfer'
    end;

    insert into public.league_activity_events (
      league_id,
      event_type,
      actor_profile_id,
      target_profile_id,
      player_id,
      amount,
      source_txid
    ) values (
      new.league_id,
      v_event_type,
      new.profile_id,
      v_from_profile_id,
      new.player_id,
      case when new.acquisition_price > 0 then new.acquisition_price else null end,
      txid_current()
    )
    on conflict (source_txid, league_id, player_id)
      where source_txid is not null and player_id is not null
    do update set
      actor_profile_id = excluded.actor_profile_id,
      target_profile_id = excluded.target_profile_id,
      event_type = excluded.event_type,
      amount = excluded.amount;

    delete from public.league_activity_transfer_buffer
    where source_txid = txid_current()
      and league_id = new.league_id
      and player_id = new.player_id
      and from_profile_id = v_from_profile_id;
  end if;

  return new;
end;
$$;

create or replace function public.activity_log_roster_owner_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_event_type text;
begin
  if old.profile_id is distinct from new.profile_id then
    v_event_type := case
      when old.release_clause is not null
        and old.release_clause > 0
        and new.acquisition_price = old.release_clause
      then 'release_clause'
      else 'player_transfer'
    end;

    insert into public.league_activity_events (
      league_id,
      event_type,
      actor_profile_id,
      target_profile_id,
      player_id,
      amount,
      source_txid
    ) values (
      new.league_id,
      v_event_type,
      new.profile_id,
      old.profile_id,
      new.player_id,
      case when new.acquisition_price > 0 then new.acquisition_price else null end,
      txid_current()
    )
    on conflict (source_txid, league_id, player_id)
      where source_txid is not null and player_id is not null
    do update set
      actor_profile_id = excluded.actor_profile_id,
      target_profile_id = excluded.target_profile_id,
      event_type = excluded.event_type,
      amount = excluded.amount;
  end if;
  return new;
end;
$$;

create or replace function public.activity_log_market_transaction()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_event_type text;
  v_from_profile_id uuid;
  v_updated integer;
begin
  if new.type in ('buy_item', 'hire_caster') then
    return new;
  end if;

  v_event_type := case new.type
    when 'buy' then 'player_bought'
    when 'sell' then 'player_sold'
    when 'clause_paid' then 'release_clause'
    when 'clause_buy' then 'release_clause'
    when 'clause_sell' then 'release_clause'
    when 'daily_market_buy' then 'auction_won'
    when 'manager_offer_buy' then 'player_transfer'
    when 'manager_offer_sell' then 'player_transfer'
    when 'trade' then 'trade'
    when 'auction_sold' then 'auction_won'
    else null
  end;

  update public.league_activity_events
  set event_type = case
        when event_type in ('release_clause', 'player_transfer') then event_type
        else coalesce(v_event_type, event_type)
      end,
      amount = new.price,
      source_market_transaction_id = new.id
  where source_txid = txid_current()
    and league_id = new.league_id
    and player_id is not distinct from new.player_id;

  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    select from_profile_id into v_from_profile_id
    from public.league_activity_transfer_buffer
    where source_txid = txid_current()
      and league_id = new.league_id
      and player_id is not distinct from new.player_id
    order by created_at desc
    limit 1;

    insert into public.league_activity_events (
      league_id,
      event_type,
      actor_profile_id,
      target_profile_id,
      player_id,
      amount,
      source_market_transaction_id,
      source_txid,
      created_at
    ) values (
      new.league_id,
      coalesce(v_event_type, 'market_operation'),
      new.profile_id,
      case when v_event_type in ('release_clause', 'trade') then v_from_profile_id else null end,
      new.player_id,
      new.price,
      new.id,
      txid_current(),
      coalesce(new.created_at, now())
    );
  end if;

  delete from public.league_activity_transfer_buffer
  where created_at < now() - interval '1 day';

  return new;
end;
$$;

revoke all on function public.activity_capture_roster_departure() from public, anon, authenticated;
revoke all on function public.activity_log_roster_arrival() from public, anon, authenticated;
revoke all on function public.activity_log_roster_owner_update() from public, anon, authenticated;
revoke all on function public.activity_log_market_transaction() from public, anon, authenticated;

commit;

select jsonb_build_object(
  'status', 'ready',
  'classification', 'roster-transfer-and-release-clause',
  'market_transaction_constraint_changed', false
) as migration_result;
