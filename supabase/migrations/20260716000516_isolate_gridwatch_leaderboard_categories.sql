-- Keep GridWatch Signal Breach's legacy global board scoped to the three
-- historical sector categories. The shared get_leaderboard RPC also serves
-- other games, so their null-category behavior is deliberately unchanged.
--
-- Phase 4 rulesets use explicit, prefixed categories and are queried by exact
-- category. This filter prevents those future rows, plus existing aggregate,
-- daily/weekly, and clear-marker rows, from leaking into old GridWatch clients
-- that still request p_category = null.
create or replace function public.get_leaderboard(
  p_game text,
  p_category text default null
)
returns table(
  rank bigint,
  handle text,
  score integer,
  rating text,
  metadata jsonb,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with scoped as (
    select distinct on (s.user_id)
      s.user_id,
      s.score,
      s.rating,
      s.metadata,
      s.created_at
    from public.scores s
    join public.games g on g.id = s.game_id
    where g.slug = p_game
      and (
        (p_category is not null and s.category = p_category)
        or (
          p_category is null
          and (
            p_game <> 'gridwatch-signal-breach'
            or s.category in ('sector:1', 'sector:2', 'sector:3')
          )
        )
      )
    order by s.user_id, s.score desc, s.created_at asc
  )
  select
    row_number() over (order by sc.score desc, sc.created_at asc) as rank,
    p.handle,
    sc.score,
    sc.rating,
    sc.metadata,
    sc.created_at
  from scoped sc
  join public.profiles p on p.user_id = sc.user_id
  order by sc.score desc, sc.created_at asc
  limit 20;
$$;

revoke all on function public.get_leaderboard(text, text) from public;

-- Anonymous and authenticated execution is intentional: this is the public,
-- read-only Top 20 leaderboard API. SECURITY DEFINER is required because the
-- scores table has RLS enabled with no direct client policies; the function
-- exposes only its bounded result set and uses an empty search_path.
grant execute on function public.get_leaderboard(text, text) to anon;
grant execute on function public.get_leaderboard(text, text) to authenticated;
grant execute on function public.get_leaderboard(text, text) to service_role;
