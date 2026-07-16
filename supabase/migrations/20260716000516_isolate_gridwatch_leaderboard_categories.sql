-- Keep GridWatch Signal Breach's legacy global board scoped to the three
-- historical sector categories, expose a phase4-v1 global selector that pools
-- only that ruleset's sector rows, and return ranks within the same comparable
-- ruleset. The shared RPCs also serve other games, so their behavior remains
-- deliberately unchanged.
--
-- Phase 4 categories are explicit and prefixed. These filters prevent tuned
-- rows, plus existing aggregate, daily/weekly, and clear-marker rows, from
-- leaking into old GridWatch clients that still request p_category = null.
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
        (
          p_category is not null
          and (
            (
              p_game = 'gridwatch-signal-breach'
              and p_category = 'phase4-v1:global'
              and s.category in (
                'phase4-v1:sector:1',
                'phase4-v1:sector:2',
                'phase4-v1:sector:3'
              )
            )
            or (
              (
                p_game <> 'gridwatch-signal-breach'
                or p_category <> 'phase4-v1:global'
              )
              and s.category = p_category
            )
          )
        )
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

-- Keep the existing shared keep-best behavior, but compute GridWatch's global
-- rank only among comparable sector rows from the same immutable ruleset.
-- Other games and non-sector categories retain the prior all-category rank.
create or replace function public.record_score(
  p_user_id uuid,
  p_slug text,
  p_category text,
  p_score integer,
  p_rating text,
  p_metadata jsonb,
  p_proof jsonb,
  p_proof_hash text
)
returns table(
  stored_score integer,
  improved boolean,
  global_rank bigint,
  sector_rank bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_game_id uuid;
  v_old integer;
  v_best integer;
  v_global_categories text[];
begin
  select g.id into v_game_id
  from public.games g
  where g.slug = p_slug;

  if v_game_id is null then
    raise exception 'unknown game %', p_slug;
  end if;

  select s.score into v_old
  from public.scores s
  where s.game_id = v_game_id
    and s.category = p_category
    and s.user_id = p_user_id;

  if v_old is null then
    insert into public.scores(
      game_id,
      category,
      user_id,
      score,
      rating,
      metadata,
      proof,
      proof_hash
    )
    values (
      v_game_id,
      p_category,
      p_user_id,
      p_score,
      p_rating,
      p_metadata,
      p_proof,
      p_proof_hash
    );
    improved := true;
  elsif p_score > v_old then
    update public.scores s
    set
      score = p_score,
      rating = p_rating,
      metadata = p_metadata,
      proof = p_proof,
      proof_hash = p_proof_hash,
      created_at = now()
    where s.game_id = v_game_id
      and s.category = p_category
      and s.user_id = p_user_id;
    improved := true;
  else
    improved := false;
  end if;

  select s.score into v_best
  from public.scores s
  where s.game_id = v_game_id
    and s.category = p_category
    and s.user_id = p_user_id;
  stored_score := v_best;

  select count(*) + 1 into sector_rank
  from public.scores s
  where s.game_id = v_game_id
    and s.category = p_category
    and s.score > v_best;

  if p_slug = 'gridwatch-signal-breach' then
    if p_category in ('sector:1', 'sector:2', 'sector:3') then
      v_global_categories := array['sector:1', 'sector:2', 'sector:3'];
    elsif p_category in (
      'phase4-v1:sector:1',
      'phase4-v1:sector:2',
      'phase4-v1:sector:3'
    ) then
      v_global_categories := array[
        'phase4-v1:sector:1',
        'phase4-v1:sector:2',
        'phase4-v1:sector:3'
      ];
    end if;
  end if;

  if v_global_categories is not null then
    with per_user as (
      select s.user_id, max(s.score) as best
      from public.scores s
      where s.game_id = v_game_id
        and s.category = any(v_global_categories)
      group by s.user_id
    ), me as (
      select max(s.score) as best
      from public.scores s
      where s.game_id = v_game_id
        and s.user_id = p_user_id
        and s.category = any(v_global_categories)
    )
    select count(*) + 1 into global_rank
    from per_user, me
    where per_user.best > me.best;
  else
    with per_user as (
      select s.user_id, max(s.score) as best
      from public.scores s
      where s.game_id = v_game_id
      group by s.user_id
    ), me as (
      select max(s.score) as best
      from public.scores s
      where s.game_id = v_game_id
        and s.user_id = p_user_id
    )
    select count(*) + 1 into global_rank
    from per_user, me
    where per_user.best > me.best;
  end if;

  return next;
end;
$$;

revoke all on function public.record_score(
  uuid,
  text,
  text,
  integer,
  text,
  jsonb,
  jsonb,
  text
) from public;
revoke all on function public.record_score(
  uuid,
  text,
  text,
  integer,
  text,
  jsonb,
  jsonb,
  text
) from anon;
revoke all on function public.record_score(
  uuid,
  text,
  text,
  integer,
  text,
  jsonb,
  jsonb,
  text
) from authenticated;
grant execute on function public.record_score(
  uuid,
  text,
  text,
  integer,
  text,
  jsonb,
  jsonb,
  text
) to service_role;
