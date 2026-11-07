begin;

-- The production database records both sides of direct transfers. Pair them so
-- one real operation produces one activity item with buyer and seller.
create temporary table activity_market_pairs on commit drop as
with buys as (
  select
    mt.*,
    case mt.type
      when 'clause_buy' then 'release_clause'
      when 'manager_offer_buy' then 'player_transfer'
    end as event_type,
    row_number() over (
      partition by mt.league_id, mt.player_id, mt.price,
        case when mt.type = 'clause_buy' then 'clause' else 'manager_offer' end
      order by mt.created_at, mt.id
    ) as pair_number
  from public.market_transactions mt
  where mt.type in ('clause_buy', 'manager_offer_buy')
),
sells as (
  select
    mt.*,
    row_number() over (
      partition by mt.league_id, mt.player_id, mt.price,
        case when mt.type = 'clause_sell' then 'clause' else 'manager_offer' end
      order by mt.created_at, mt.id
    ) as pair_number
  from public.market_transactions mt
  where mt.type in ('clause_sell', 'manager_offer_sell')
)
select
  b.id as buy_transaction_id,
  s.id as sell_transaction_id,
  b.profile_id as buyer_profile_id,
  s.profile_id as seller_profile_id,
  b.event_type
from buys b
join sells s
  on s.league_id = b.league_id
 and s.player_id = b.player_id
 and s.price = b.price
 and s.pair_number = b.pair_number
 and (
   (b.type = 'clause_buy' and s.type = 'clause_sell')
   or (b.type = 'manager_offer_buy' and s.type = 'manager_offer_sell')
 )
 and abs(extract(epoch from (s.created_at - b.created_at))) <= 300;

update public.league_activity_events e
set event_type = p.event_type,
    actor_profile_id = p.buyer_profile_id,
    target_profile_id = p.seller_profile_id
from activity_market_pairs p
where e.source_market_transaction_id = p.buy_transaction_id;

delete from public.league_activity_events e
using activity_market_pairs p
where e.source_market_transaction_id = p.sell_transaction_id;

-- Reclassify every remaining historical market event from its real type.
update public.league_activity_events e
set event_type = case mt.type
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
    amount = mt.price
from public.market_transactions mt
where e.source_market_transaction_id = mt.id;

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
      case when v_event_type in ('release_clause', 'trade', 'player_transfer') then v_from_profile_id else null end,
      new.player_id,
      new.price,
      new.id,
      txid_current(),
      coalesce(new.created_at, now())
    )
    on conflict (source_txid, league_id, player_id)
      where source_txid is not null and player_id is not null
    do update set
      event_type = case
        when league_activity_events.event_type in ('release_clause', 'player_transfer')
          then league_activity_events.event_type
        else excluded.event_type
      end,
      amount = excluded.amount,
      source_market_transaction_id = excluded.source_market_transaction_id;
  end if;

  delete from public.league_activity_transfer_buffer
  where created_at < now() - interval '1 day';

  return new;
end;
$$;

revoke all on function public.activity_log_market_transaction() from public, anon, authenticated;

commit;

select event_type, count(*) as events
from public.league_activity_events
group by event_type
order by event_type;
