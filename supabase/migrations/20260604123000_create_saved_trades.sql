create table public.saved_trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  url text not null,
  title text not null,
  created_at timestamptz not null default now(),
  unique (user_id, url)
);

alter table public.saved_trades enable row level security;

create policy "Users can read their saved trades"
on public.saved_trades
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can save their own trades"
on public.saved_trades
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can delete their saved trades"
on public.saved_trades
for delete
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.enforce_saved_trades_limit()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if (select count(*) from public.saved_trades where user_id = new.user_id) >= 20 then
    raise exception 'A user can save no more than 20 trades';
  end if;
  return new;
end;
$$;

create trigger enforce_saved_trades_limit_before_insert
before insert on public.saved_trades
for each row execute procedure public.enforce_saved_trades_limit();
