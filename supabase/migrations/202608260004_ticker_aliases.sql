-- Explicit corporate-action mapping for Bursa ticker-code changes.
-- New tickers intentionally have no FK so an upcoming code change can be
-- registered before the replacement ticker first appears in the master feed.
create table public.ticker_aliases (
  old_ticker varchar(5) primary key references public.bursa_master(ticker) on update cascade on delete restrict,
  new_ticker varchar(5) not null,
  effective_date date,
  reason text,
  created_at timestamptz not null default now(),
  applied_at timestamptz,
  constraint ticker_aliases_old_ticker_format check (old_ticker ~ '^[0-9]{4,5}$'),
  constraint ticker_aliases_new_ticker_format check (new_ticker ~ '^[0-9]{4,5}$'),
  constraint ticker_aliases_distinct_tickers check (old_ticker <> new_ticker)
);

create index ticker_aliases_new_ticker_idx on public.ticker_aliases (new_ticker);

alter table public.ticker_aliases enable row level security;
alter table public.ticker_aliases force row level security;

create policy "authenticated users can read ticker aliases"
  on public.ticker_aliases for select to authenticated using (true);
create policy "authenticated users can insert ticker aliases"
  on public.ticker_aliases for insert to authenticated with check (true);
create policy "authenticated users can update ticker aliases"
  on public.ticker_aliases for update to authenticated using (true) with check (true);
create policy "authenticated users can delete ticker aliases"
  on public.ticker_aliases for delete to authenticated using (true);

revoke all on public.ticker_aliases from anon;
grant select, insert, update, delete on public.ticker_aliases to authenticated;
grant all on public.ticker_aliases to service_role;

-- Runs after every validated master upsert. Alias chains resolve to their final
-- ticker, cycles fail loudly, and EOD rows are intentionally never rewritten.
create or replace function public.reconcile_ticker_aliases()
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  mapping record;
  affected bigint;
  saved_repointed bigint := 0;
  blacklist_repointed bigint := 0;
  names_refreshed bigint := 0;
  aliases_pending bigint := 0;
begin
  update public.blacklist as exclusion
  set name = master.name
  from public.bursa_master as master
  where master.ticker = exclusion.ticker
    and exclusion.name is distinct from master.name;
  get diagnostics names_refreshed = row_count;

  if exists (
    with recursive paths as (
      select
        ticker_change.old_ticker,
        ticker_change.new_ticker,
        array[ticker_change.old_ticker, ticker_change.new_ticker]::varchar[] as visited,
        false as cycle
      from public.ticker_aliases as ticker_change

      union all

      select
        path.old_ticker,
        next_alias.new_ticker,
        path.visited || next_alias.new_ticker,
        next_alias.new_ticker = any(path.visited)
      from paths as path
      join public.ticker_aliases as next_alias on next_alias.old_ticker = path.new_ticker
      where not path.cycle
    )
    select 1 from paths where cycle
  ) then
    raise check_violation using message = 'ticker_aliases contains a cycle';
  end if;

  for mapping in
    with recursive paths as (
      select
        ticker_change.old_ticker,
        ticker_change.new_ticker,
        array[ticker_change.old_ticker, ticker_change.new_ticker]::varchar[] as visited
      from public.ticker_aliases as ticker_change

      union all

      select
        path.old_ticker,
        next_alias.new_ticker,
        path.visited || next_alias.new_ticker
      from paths as path
      join public.ticker_aliases as next_alias on next_alias.old_ticker = path.new_ticker
      where not next_alias.new_ticker = any(path.visited)
    ),
    resolved as (
      select distinct on (old_ticker)
        old_ticker,
        new_ticker
      from paths
      order by old_ticker, cardinality(visited) desc
    )
    select resolved.old_ticker, resolved.new_ticker
    from resolved
    order by resolved.old_ticker
  loop
    if not exists (
      select 1
      from public.bursa_master as target
      where target.ticker = mapping.new_ticker
        and target.is_ordinary = true
    ) then
      aliases_pending := aliases_pending + 1;
      continue;
    end if;

    insert into public.saved_tickers (user_id, ticker, created_at)
    select saved.user_id, mapping.new_ticker, saved.created_at
    from public.saved_tickers as saved
    where saved.ticker = mapping.old_ticker
    on conflict (user_id, ticker) do update
      set created_at = least(public.saved_tickers.created_at, excluded.created_at);

    delete from public.saved_tickers
    where ticker = mapping.old_ticker;
    get diagnostics affected = row_count;
    saved_repointed := saved_repointed + affected;

    insert into public.blacklist (ticker, name, reason, created_at)
    select mapping.new_ticker, target.name, exclusion.reason, exclusion.created_at
    from public.blacklist as exclusion
    join public.bursa_master as target on target.ticker = mapping.new_ticker
    where exclusion.ticker = mapping.old_ticker
    on conflict (ticker) do update
      set name = excluded.name,
          reason = case
            when public.blacklist.reason = excluded.reason then public.blacklist.reason
            else public.blacklist.reason || E'\n' || excluded.reason
          end,
          created_at = least(public.blacklist.created_at, excluded.created_at);

    delete from public.blacklist
    where ticker = mapping.old_ticker;
    get diagnostics affected = row_count;
    blacklist_repointed := blacklist_repointed + affected;

    update public.ticker_aliases
    set applied_at = now()
    where old_ticker = mapping.old_ticker;
  end loop;

  return jsonb_build_object(
    'saved_repointed', saved_repointed,
    'blacklist_repointed', blacklist_repointed,
    'names_refreshed', names_refreshed,
    'aliases_pending', aliases_pending
  );
end;
$$;

revoke all on function public.reconcile_ticker_aliases() from public, anon, authenticated;
grant execute on function public.reconcile_ticker_aliases() to service_role;
