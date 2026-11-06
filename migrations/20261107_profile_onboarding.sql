-- Persistent onboarding for new VFantasy coaches.
-- Existing profiles are considered onboarded so they are not interrupted after deployment.
-- They can still replay the guide from the dashboard at any time.

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'onboarding_status'
  ) then
    alter table public.profiles add column onboarding_status text;
    update public.profiles set onboarding_status = 'completed';
  end if;
end
$$;

alter table public.profiles
  alter column onboarding_status set default 'pending';

update public.profiles
set onboarding_status = 'completed'
where onboarding_status is null;

alter table public.profiles
  alter column onboarding_status set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_onboarding_status_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_onboarding_status_check
      check (onboarding_status in ('pending', 'completed', 'skipped'));
  end if;
end
$$;

alter table public.profiles
  add column if not exists onboarding_completed_at timestamptz;

update public.profiles
set onboarding_completed_at = coalesce(onboarding_completed_at, now())
where onboarding_status in ('completed', 'skipped');

comment on column public.profiles.onboarding_status is
  'Controls whether the first-login coach tutorial is pending, completed or skipped.';

comment on column public.profiles.onboarding_completed_at is
  'Timestamp when the coach completed or skipped the onboarding tutorial.';

create or replace function public.set_my_onboarding_status(p_status text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile_id uuid := auth.uid();
begin
  if v_profile_id is null then
    raise exception 'Authentication required';
  end if;

  if p_status not in ('completed', 'skipped') then
    raise exception 'Invalid onboarding status';
  end if;

  update public.profiles
  set onboarding_status = p_status,
      onboarding_completed_at = now()
  where id = v_profile_id;

  if not found then
    raise exception 'Profile not found';
  end if;

  return jsonb_build_object('success', true, 'status', p_status);
end;
$$;

revoke all on function public.set_my_onboarding_status(text) from public, anon;
grant execute on function public.set_my_onboarding_status(text) to authenticated;

select
  onboarding_status,
  count(*) as profiles
from public.profiles
group by onboarding_status
order by onboarding_status;
