create table public.polymarket_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  address text not null,
  name text,
  pseudonym text,
  proxy_wallet text,
  profile_image text,
  x_username text,
  verified_badge boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

alter table public.polymarket_profiles enable row level security;

create policy "Users can read their Polymarket profiles"
on public.polymarket_profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can save their Polymarket profiles"
on public.polymarket_profiles
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their Polymarket profiles"
on public.polymarket_profiles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their Polymarket profiles"
on public.polymarket_profiles
for delete
to authenticated
using ((select auth.uid()) = user_id);
