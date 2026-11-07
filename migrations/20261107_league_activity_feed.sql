-- Persistent, league-scoped activity feed.
-- Records membership and roster movements without trusting client-provided event text.

create table if not exists public.league_activity_events (
  id uuid primary key default extensions.uuid_generate_v4(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  event_type text not null,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  target_profile_id uuid references public.profiles(id) on delete set null,
  player_id uuid references public.pro_players(id) on delete set null,
  amount bigint,
  metadata jsonb not null default '{}'::jsonb,
  source_market_transaction_id uuid unique references public.market_transactions(id) on delete set null,
  source_txid bigint,
  created_at timestamptz not null default now()
);

create unique index if not exists league_activity_events_source_txid_player_idx
  on public.league_activity_events(source_txid, league_id, player_id)
  where source_txid is not null and player_id is not null;

create index if not exists league_activity_events_league_created_idx
  on public.league_activity_events(league_id, created_at desc);

create index if not exists league_activity_events_actor_idx
  on public.league_activity_events(actor_profile_id, created_at desc);

alter table public.league_activity_events enable row level security;

drop policy if exists league_activity_members_read on public.league_activity_events;
create policy league_activity_members_read
  on public.league_activity_events
  for select
  to authenticated
  using (public.is_league_member(league_id));

revoke all on public.league_activity_events from public, anon, authenticated;
grant select on public.league_activity_events to authenticated;
grant all on public.league_activity_events to service_role;

-- Private transfer correlation buffer. Trigger functions are the only writers.
create table if not exists public.league_activity_transfer_buffer (
  source_txid bigint not null,
  league_id uuid not null references public.leagues(id) on delete cascade,
  player_id uuid not null references public.pro_players(id) on delete cascade,
  from_profile_id uuid not null references public.profiles(id) on delete cascade,
  from_release_clause bigint,
  created_at timestamptz not null default now(),
  primary key (source_txid, league_id, player_id, from_profile_id)
);

alter table public.league_activity_transfer_buffer enable row level security;
revoke all on public.league_activity_transfer_buffer from public, anon, authenticated;
grant all on public.league_activity_transfer_buffer to service_role;

create or replace function public.activity_log_league_created()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.league_activity_events (
    league_id, event_type, actor_profile_id, created_at
  ) values (
    new.id, 'league_created', new.creator_id, coalesce(new.created_at, now())
  );
  return new;
end;
$$;

create or replace function public.activity_log_member_joined()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_creator_id uuid;
begin
  select creator_id into v_creator_id
  from public.leagues
  where id = new.league_id;

  if new.profile_id is distinct from v_creator_id then
    insert into public.league_activity_events (
      league_id, event_type, actor_profile_id, created_at
    ) values (
      new.league_id, 'member_joined', new.profile_id, coalesce(new.created_at, now())
    );
  end if;
  return new;
end;
$$;

create or replace function public.activity_log_member_left()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.league_activity_events (
    league_id, event_type, actor_profile_id
  ) values (
    old.league_id, 'member_left', old.profile_id
  );

  delete from public.league_activity_transfer_buffer
  where league_id = old.league_id
    and from_profile_id = old.profile_id;

  return old;
end;
$$;

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

  -- Opportunistic cleanup for abandoned correlation rows.
  delete from public.league_activity_transfer_buffer
  where created_at < now() - interval '1 day';

  return new;
end;
$$;

drop trigger if exists activity_league_created on public.leagues;
create trigger activity_league_created
  after insert on public.leagues
  for each row execute function public.activity_log_league_created();

drop trigger if exists activity_member_joined on public.league_participants;
create trigger activity_member_joined
  after insert on public.league_participants
  for each row execute function public.activity_log_member_joined();

drop trigger if exists activity_member_left on public.league_participants;
create trigger activity_member_left
  before delete on public.league_participants
  for each row execute function public.activity_log_member_left();

drop trigger if exists activity_roster_departure on public.user_rosters;
create trigger activity_roster_departure
  before delete on public.user_rosters
  for each row execute function public.activity_capture_roster_departure();

drop trigger if exists activity_roster_arrival on public.user_rosters;
create trigger activity_roster_arrival
  after insert on public.user_rosters
  for each row execute function public.activity_log_roster_arrival();

drop trigger if exists activity_roster_owner_update on public.user_rosters;
create trigger activity_roster_owner_update
  after update of profile_id on public.user_rosters
  for each row execute function public.activity_log_roster_owner_update();

drop trigger if exists activity_market_transaction on public.market_transactions;
create trigger activity_market_transaction
  after insert on public.market_transactions
  for each row execute function public.activity_log_market_transaction();

revoke all on function public.activity_log_league_created() from public, anon, authenticated;
revoke all on function public.activity_log_member_joined() from public, anon, authenticated;
revoke all on function public.activity_log_member_left() from public, anon, authenticated;
revoke all on function public.activity_capture_roster_departure() from public, anon, authenticated;
revoke all on function public.activity_log_roster_arrival() from public, anon, authenticated;
revoke all on function public.activity_log_roster_owner_update() from public, anon, authenticated;
revoke all on function public.activity_log_market_transaction() from public, anon, authenticated;

-- Backfill existing history without fabricating counterparties that were never stored.
insert into public.league_activity_events (
  league_id, event_type, actor_profile_id, created_at, metadata
)
select
  l.id,
  'league_created',
  l.creator_id,
  coalesce(l.created_at, now()),
  jsonb_build_object('backfilled', true)
from public.leagues l
where not exists (
  select 1 from public.league_activity_events e
  where e.league_id = l.id and e.event_type = 'league_created'
);

insert into public.league_activity_events (
  league_id, event_type, actor_profile_id, created_at, metadata
)
select
  lp.league_id,
  'member_joined',
  lp.profile_id,
  coalesce(lp.created_at, now()),
  jsonb_build_object('backfilled', true)
from public.league_participants lp
join public.leagues l on l.id = lp.league_id
where lp.profile_id is distinct from l.creator_id
  and not exists (
    select 1 from public.league_activity_events e
    where e.league_id = lp.league_id
      and e.event_type = 'member_joined'
      and e.actor_profile_id = lp.profile_id
  );

insert into public.league_activity_events (
  league_id,
  event_type,
  actor_profile_id,
  player_id,
  amount,
  source_market_transaction_id,
  created_at,
  metadata
)
select
  mt.league_id,
  case mt.type
    when 'buy' then 'player_bought'
    when 'sell' then 'player_sold'
    when 'clause_paid' then 'release_clause'
    when 'clause_buy' then 'release_clause'
    when 'clause_sell' then 'release_clause'
    when 'daily_market_buy' then 'auction_won'
    when 'manager_offer_buy' then 'player_transfer'
    when 'manager_offer_sell' then 'player_sold'
    when 'trade' then 'trade'
    when 'auction_sold' then 'auction_won'
    else 'market_operation'
  end,
  mt.profile_id,
  mt.player_id,
  mt.price,
  mt.id,
  coalesce(mt.created_at, now()),
  jsonb_build_object('backfilled', true)
from public.market_transactions mt
where mt.league_id is not null
  and mt.type not in ('buy_item', 'hire_caster')
on conflict (source_market_transaction_id) do nothing;

select
  event_type,
  count(*) as events
from public.league_activity_events
group by event_type
order by event_type;
