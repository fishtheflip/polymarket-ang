create table public.saved_traders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  address text not null,
  name text,
  pseudonym text,
  profile_image text,
  created_at timestamptz not null default now()
);

create unique index saved_traders_user_address_unique
on public.saved_traders (user_id, lower(address));

alter table public.saved_traders enable row level security;

create policy "Users can read their saved traders"
on public.saved_traders
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can save their own traders"
on public.saved_traders
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can delete their saved traders"
on public.saved_traders
for delete
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.enforce_saved_traders_limit()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if (select count(*) from public.saved_traders where user_id = new.user_id) >= 20 then
    raise exception 'A user can save no more than 20 traders';
  end if;
  return new;
end;
$$;

create trigger enforce_saved_traders_limit_before_insert
before insert on public.saved_traders
for each row execute procedure public.enforce_saved_traders_limit();
