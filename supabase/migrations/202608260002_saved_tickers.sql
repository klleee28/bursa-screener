-- Private, per-user saved ticker list.
create table public.saved_tickers (
  user_id uuid not null references auth.users(id) on delete cascade,
  ticker varchar(5) not null references public.bursa_master(ticker) on update cascade on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, ticker)
);

-- Supports foreign-key checks when a Bursa master row is updated or removed.
create index saved_tickers_ticker_idx on public.saved_tickers (ticker);

alter table public.saved_tickers enable row level security;
alter table public.saved_tickers force row level security;

create policy "users can read their saved tickers"
  on public.saved_tickers for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "users can save tickers"
  on public.saved_tickers for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "users can remove their saved tickers"
  on public.saved_tickers for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.saved_tickers from anon;
grant select, insert, delete on public.saved_tickers to authenticated;
grant all on public.saved_tickers to service_role;
