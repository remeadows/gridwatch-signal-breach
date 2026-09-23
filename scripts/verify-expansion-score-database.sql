-- Only run in an empty disposable database, NEVER GridWatchGamesDB.
\set ON_ERROR_STOP on
begin;
do $$begin
  if not exists(select from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists(select from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists(select from pg_roles where rolname='service_role') then create role service_role nologin; end if;
end $$;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$select null::uuid$$;
create table public.games(id uuid primary key default gen_random_uuid(), slug text unique not null);
create table public.profiles(user_id uuid primary key, handle text not null);
-- Baseline score shape after the auth-identity migration. Apply the actual
-- production read/write migrations below, including their grants.
create table public.scores(id uuid primary key default gen_random_uuid(), game_id uuid not null references public.games,
  category text not null, user_id uuid not null references public.profiles, score integer not null,
  rating text, metadata jsonb, proof jsonb, proof_hash text, created_at timestamptz not null default now(),
  constraint scores_game_category_user_unique unique(game_id,category,user_id));
alter table public.scores enable row level security;
\ir ../supabase/migrations/20260716000516_isolate_gridwatch_leaderboard_categories.sql
\ir ../supabase/migrations/20260716015402_harden_gridwatch_leaderboard_writes.sql
insert into public.games(slug) values ('gridwatch-signal-breach'),('grid-drift'),('gridwatch-match');
insert into public.profiles values
 ('11111111-1111-1111-1111-111111111111','Alice'),('22222222-2222-2222-2222-222222222222','Bob');
do $$declare
 a uuid := '11111111-1111-1111-1111-111111111111'; b uuid := '22222222-2222-2222-2222-222222222222';
 cat text := 'expansion-v1:expansion-1-r4:level:1'; r record; n integer;
begin
 perform public.record_score(a,'grid-drift','standard',20,'A','{}','{}','drift');
 perform public.record_score(a,'gridwatch-match','standard',30,'A','{}','{}','match');
 perform public.record_score(a,'gridwatch-signal-breach','sector:1',40,'A','{}','{}','legacy');
 perform public.record_score(a,'gridwatch-signal-breach','phase4-v1:sector:1',50,'A','{}','{}','original');
 perform public.record_score(a,'gridwatch-signal-breach','expansion-v1:expansion-1-r4:level:2',9999,'A','{}','{}','level2');
 select * into r from public.record_score(a,'gridwatch-signal-breach',cat,100,'A','{}','{}','first');
 if not r.improved or r.stored_score<>100 or r.sector_rank<>1 then raise exception 'Initial exact-level score failed'; end if;
 select * into r from public.record_score(a,'gridwatch-signal-breach',cat,80,'B','{}','{}','lower');
 if r.improved or r.stored_score<>100 then raise exception 'Lower score replaced best'; end if;
 select * into r from public.record_score(a,'gridwatch-signal-breach',cat,100,'A','{}','{}','duplicate');
 if r.improved then raise exception 'Duplicate not idempotent'; end if;
 perform public.record_score(b,'gridwatch-signal-breach',cat,100,'A','{}','{}','tie');
 select count(*) into n from public.get_leaderboard('gridwatch-signal-breach',cat) where rank=1 and score=100;
 if n<>2 then raise exception 'Ties or level isolation failed'; end if;
 select * into r from public.record_score(b,'gridwatch-signal-breach',cat,120,'A','{}','{}','higher');
 if not r.improved or r.stored_score<>120 or r.sector_rank<>1 then raise exception 'Higher score failed'; end if;
 select * into r from public.record_score(a,'gridwatch-signal-breach',cat,100,'A','{}','{}','retry');
 if r.sector_rank<>2 then raise exception 'Submitted rank differs from board'; end if;
 if (select score from public.get_leaderboard('gridwatch-signal-breach',null))<>40 then raise exception 'Legacy board contaminated'; end if;
 if (select score from public.get_leaderboard('gridwatch-signal-breach','phase4-v1:global'))<>50 then raise exception 'Original global contaminated'; end if;
 if (select score from public.get_leaderboard('grid-drift',null))<>20 then raise exception 'Drift changed'; end if;
 if (select score from public.get_leaderboard('gridwatch-match',null))<>30 then raise exception 'Match changed'; end if;
 if (select proof_hash from public.scores where user_id=a and category=cat)<>'first' then raise exception 'Lower/duplicate changed proof'; end if;
 if (select count(*) from public.scores)<>7 then raise exception 'Unexpected hub/global writes'; end if;
end $$;
set role authenticated;
do $$begin
 if (select count(*) from public.get_leaderboard('gridwatch-signal-breach','expansion-v1:expansion-1-r4:level:1'))<>2 then raise exception 'Public read failed'; end if;
 begin perform public.record_score('11111111-1111-1111-1111-111111111111','gridwatch-signal-breach','forged',999,'A','{}','{}','x');
 raise exception 'Client score write allowed'; exception when insufficient_privilege then null; end;
 begin perform 1 from public.scores; raise exception 'Direct score read allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
set role anon;
do $$begin
 if (select count(*) from public.get_leaderboard('gridwatch-signal-breach','expansion-v1:expansion-1-r4:level:25'))<>0 then raise exception 'Empty level read failed'; end if;
 begin perform public.record_score('11111111-1111-1111-1111-111111111111','gridwatch-signal-breach','forged',999,'A','{}','{}','x');
 raise exception 'Anonymous score write allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
\echo 'Expansion score DB: exact level isolation, keep-best, duplicates, ties, original/other-game sentinels and client write denial passed.'
