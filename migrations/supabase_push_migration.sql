-- Create table for storing push subscriptions
create table public.push_subscriptions (
  id uuid not null default extensions.uuid_generate_v4 (),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamp with time zone default now(),
  constraint push_subscriptions_pkey primary key (id)
);

-- Enable RLS
alter table public.push_subscriptions enable row level security;

-- Policies
create policy "Users can manage their own subscriptions" 
on public.push_subscriptions
for all 
using (auth.uid() = user_id);
