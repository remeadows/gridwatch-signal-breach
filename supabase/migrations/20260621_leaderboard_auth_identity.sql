-- Auth-backed leaderboard: per-player identity, best-per-user scores, and
-- authoritative handle sanitization. Builds on the leaderboard schema from the
-- initial submission feature (public.games, public.scores).
--
-- Applied to the GridWatchGamesDB project; kept here as the source of truth.

-- ---------------------------------------------------------------------------
-- Player profiles: one per authenticated user, owning a unique display handle.
-- ---------------------------------------------------------------------------
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  handle text not null check (char_length(handle) between 1 and 12),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index profiles_handle_lower_unique on public.profiles (lower(handle));

alter table public.profiles enable row level security;

-- Each user may read and manage only their own profile row. Public display of
-- handles happens through get_leaderboard (SECURITY DEFINER), not direct reads.
create policy profiles_select_own on public.profiles
  for select to authenticated using (auth.uid() = user_id);
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check (auth.uid() = user_id);
create policy profiles_update_own on public.profiles
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Tie scores to a user; keep exactly one (best) row per user per board.
-- ---------------------------------------------------------------------------
alter table public.scores add column user_id uuid references auth.users(id) on delete cascade;
alter table public.scores alter column user_id set not null;
alter table public.scores drop constraint scores_game_proof_unique;
alter table public.scores drop column handle;
alter table public.scores add constraint scores_game_category_user_unique unique (game_id, category, user_id);

-- ---------------------------------------------------------------------------
-- Authoritative, server-side handle sanitization (runs regardless of client).
-- ---------------------------------------------------------------------------
create or replace function public.sanitize_handle()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.handle := btrim(
    regexp_replace(
      regexp_replace(coalesce(new.handle, ''), '[[:cntrl:]]', '', 'g'),
      '\s+', ' ', 'g'
    )
  );
  new.handle := regexp_replace(
    new.handle, '\m(fuck|shit|cunt|nigger|faggot)\M', '****', 'gi'
  );
  new.handle := left(new.handle, 12);
  if char_length(new.handle) < 1 then
    new.handle := 'ANON';
  end if;
  return new;
end;
$$;

create trigger profiles_sanitize_handle
  before insert or update of handle on public.profiles
  for each row execute function public.sanitize_handle();

-- ---------------------------------------------------------------------------
-- Top 20, one row per user (their best). Global board collapses each user's
-- best across sectors.
-- ---------------------------------------------------------------------------
create or replace function public.get_leaderboard(p_game text, p_category text default null)
returns table(rank bigint, handle text, score integer, rating text, metadata jsonb, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  with scoped as (
    select distinct on (s.user_id)
      s.user_id, s.score, s.rating, s.metadata, s.created_at
    from public.scores s
    join public.games g on g.id = s.game_id
    where g.slug = p_game
      and (p_category is null or s.category = p_category)
    order by s.user_id, s.score desc, s.created_at asc
  )
  select
    row_number() over (order by sc.score desc, sc.created_at asc) as rank,
    p.handle, sc.score, sc.rating, sc.metadata, sc.created_at
  from scoped sc
  join public.profiles p on p.user_id = sc.user_id
  order by sc.score desc, sc.created_at asc
  limit 20;
$$;

-- ---------------------------------------------------------------------------
-- Atomic "keep best" upsert + rank computation. Service-role only: the Edge
-- Function passes the authenticated user_id and the server-recomputed score, so
-- clients can never write scores directly.
-- ---------------------------------------------------------------------------
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
returns table(stored_score integer, improved boolean, global_rank bigint, sector_rank bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game_id uuid;
  v_old integer;
  v_best integer;
begin
  select id into v_game_id from public.games where slug = p_slug;
  if v_game_id is null then
    raise exception 'unknown game %', p_slug;
  end if;

  select score into v_old from public.scores
    where game_id = v_game_id and category = p_category and user_id = p_user_id;

  if v_old is null then
    insert into public.scores(game_id, category, user_id, score, rating, metadata, proof, proof_hash)
    values (v_game_id, p_category, p_user_id, p_score, p_rating, p_metadata, p_proof, p_proof_hash);
    improved := true;
  elsif p_score > v_old then
    update public.scores set
      score = p_score, rating = p_rating, metadata = p_metadata,
      proof = p_proof, proof_hash = p_proof_hash, created_at = now()
    where game_id = v_game_id and category = p_category and user_id = p_user_id;
    improved := true;
  else
    improved := false;
  end if;

  select score into v_best from public.scores
    where game_id = v_game_id and category = p_category and user_id = p_user_id;
  stored_score := v_best;

  select count(*) + 1 into sector_rank from public.scores s
    where s.game_id = v_game_id and s.category = p_category and s.score > v_best;

  with per_user as (
    select user_id, max(score) as best
    from public.scores where game_id = v_game_id group by user_id
  ), me as (
    select max(score) as best
    from public.scores where game_id = v_game_id and user_id = p_user_id
  )
  select count(*) + 1 into global_rank
  from per_user, me where per_user.best > me.best;

  return next;
end;
$$;

revoke all on function public.record_score(uuid, text, text, integer, text, jsonb, jsonb, text) from public;
revoke all on function public.record_score(uuid, text, text, integer, text, jsonb, jsonb, text) from anon;
revoke all on function public.record_score(uuid, text, text, integer, text, jsonb, jsonb, text) from authenticated;
grant execute on function public.record_score(uuid, text, text, integer, text, jsonb, jsonb, text) to service_role;
