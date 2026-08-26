-- Bursa Filter: initial schema and authenticated-only access policies.
create extension if not exists pgcrypto;

create table public.bursa_master (
  ticker varchar(5) primary key,
  name varchar(255) not null,
  market varchar(32) not null,
  sector varchar(128) not null,
  is_ordinary boolean not null default false,
  constraint bursa_master_ticker_format check (ticker ~ '^[0-9]{4,5}$'),
  constraint bursa_master_market_check check (market in ('Main Market', 'ACE Market'))
);

create table public.blacklist (
  id uuid primary key default gen_random_uuid(),
  ticker varchar(5) not null unique references public.bursa_master(ticker) on update cascade on delete restrict,
  name varchar(255) not null,
  reason text not null,
  created_at timestamptz not null default now(),
  constraint blacklist_reason_not_blank check (length(trim(reason)) > 0)
);

create table public.eod_data (
  ticker varchar(5) not null references public.bursa_master(ticker) on update cascade on delete restrict,
  date date not null,
  close_price numeric(18, 4),
  change_pct numeric(12, 6),
  volume bigint,
  market_cap bigint,
  primary key (ticker, date),
  constraint eod_close_price_nonnegative check (close_price is null or close_price >= 0),
  constraint eod_volume_nonnegative check (volume is null or volume >= 0),
  constraint eod_market_cap_nonnegative check (market_cap is null or market_cap >= 0)
);

-- Postgres does not automatically index foreign keys. The blacklist unique
-- constraint covers blacklist.ticker; this index supports latest-date reads.
create index eod_data_date_ticker_idx on public.eod_data (date desc, ticker)
  include (close_price, change_pct, volume, market_cap);
create index bursa_master_ordinary_market_sector_idx on public.bursa_master (market, sector, ticker)
  where is_ordinary = true;

alter table public.bursa_master enable row level security;
alter table public.blacklist enable row level security;
alter table public.eod_data enable row level security;

alter table public.bursa_master force row level security;
alter table public.blacklist force row level security;
alter table public.eod_data force row level security;

-- The project must have public sign-ups disabled and only the admin account
-- provisioned. service_role has BYPASSRLS and remains reserved for the ETL.
create policy "authenticated users can read bursa master"
  on public.bursa_master for select to authenticated using (true);
create policy "authenticated users can insert bursa master"
  on public.bursa_master for insert to authenticated with check (true);
create policy "authenticated users can update bursa master"
  on public.bursa_master for update to authenticated using (true) with check (true);
create policy "authenticated users can delete bursa master"
  on public.bursa_master for delete to authenticated using (true);

create policy "authenticated users can read blacklist"
  on public.blacklist for select to authenticated using (true);
create policy "authenticated users can insert blacklist"
  on public.blacklist for insert to authenticated with check (true);
create policy "authenticated users can update blacklist"
  on public.blacklist for update to authenticated using (true) with check (true);
create policy "authenticated users can delete blacklist"
  on public.blacklist for delete to authenticated using (true);

create policy "authenticated users can read eod data"
  on public.eod_data for select to authenticated using (true);
create policy "authenticated users can insert eod data"
  on public.eod_data for insert to authenticated with check (true);
create policy "authenticated users can update eod data"
  on public.eod_data for update to authenticated using (true) with check (true);
create policy "authenticated users can delete eod data"
  on public.eod_data for delete to authenticated using (true);

revoke all on public.bursa_master, public.blacklist, public.eod_data from anon;
grant select, insert, update, delete on public.bursa_master, public.blacklist, public.eod_data to authenticated;
grant all on public.bursa_master, public.blacklist, public.eod_data to service_role;
