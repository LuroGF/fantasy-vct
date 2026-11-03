begin;

-- New notifications already store these contextual destinations in
-- lib/actions/market.ts. Backfill previously created notifications too.
update public.notifications
set action_url = '/market?league=' || league_id::text || '&tab=sales'
where league_id is not null
  and type in ('manager_offer_received', 'manager_offer_updated');

update public.notifications
set action_url = '/market?league=' || league_id::text || '&tab=offers'
where league_id is not null
  and type = 'manager_offer_rejected';

update public.notifications
set action_url = '/team?league=' || league_id::text
where league_id is not null
  and type = 'manager_offer_accepted';

commit;
