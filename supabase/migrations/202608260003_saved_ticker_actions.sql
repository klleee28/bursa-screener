-- Collapse saved-ticker eligibility checks and mutation into one database call.
-- Both functions run with the caller's privileges, so existing RLS policies
-- continue to enforce the authenticated user's private saved list.
create or replace function public.save_ticker(p_ticker varchar)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  inserted_ticker varchar(5);
begin
  if (select auth.uid()) is null then
    raise insufficient_privilege using message = 'Authentication required';
  end if;

  insert into public.saved_tickers (user_id, ticker)
  select (select auth.uid()), master.ticker
  from public.bursa_master as master
  where master.ticker = p_ticker
    and master.is_ordinary = true
    and not exists (
      select 1 from public.blacklist as exclusion
      where exclusion.ticker = master.ticker
    )
  on conflict (user_id, ticker) do nothing
  returning ticker into inserted_ticker;

  if inserted_ticker is not null then
    return 'saved';
  end if;

  if exists (
    select 1 from public.saved_tickers
    where user_id = (select auth.uid()) and ticker = p_ticker
  ) then
    return 'already_saved';
  end if;

  if exists (select 1 from public.blacklist where ticker = p_ticker) then
    return 'blacklisted';
  end if;

  return 'not_eligible';
end;
$$;

create or replace function public.remove_saved_ticker(p_ticker varchar)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise insufficient_privilege using message = 'Authentication required';
  end if;

  delete from public.saved_tickers
  where user_id = (select auth.uid()) and ticker = p_ticker;

  return found;
end;
$$;

revoke all on function public.save_ticker(varchar) from public, anon;
revoke all on function public.remove_saved_ticker(varchar) from public, anon;
grant execute on function public.save_ticker(varchar) to authenticated;
grant execute on function public.remove_saved_ticker(varchar) to authenticated;
