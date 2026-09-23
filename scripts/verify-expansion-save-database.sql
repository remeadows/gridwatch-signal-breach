-- Run ONLY in an empty disposable PostgreSQL database, never in GridWatchGamesDB.
\set ON_ERROR_STOP on
create role anon nologin;
create role authenticated nologin;
create schema auth;
create function auth.uid() returns uuid language sql stable as
  $$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;
create table public.games(id uuid primary key, slug text unique not null);
create table public.game_saves(user_id uuid not null, game_id uuid not null references public.games,
  slot text not null, schema_version integer not null, revision bigint not null,
  payload jsonb not null check (octet_length(payload::text) <= 131072), device_id uuid,
  updated_at timestamptz not null default now(), primary key(user_id,game_id,slot));
alter table public.game_saves enable row level security;
insert into public.games values
  ('00000000-0000-0000-0000-000000000001','gridwatch-signal-breach'),
  ('00000000-0000-0000-0000-000000000002','gridwatch-zero');
insert into public.game_saves values
  ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-000000000002','main',1,1,'{"sentinel":"unchanged"}',null,now());
begin;
\ir fixtures/historical-expansion-save-rpc.sql
commit;
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
do $$declare v jsonb; payload jsonb := '{"schema":1,"contentRevision":"expansion-1-r4","clearedLevels":[1],"settings":{"lowEffects":false},"checkpoint":null}';
begin
  if public.get_signal_breach_expansion_save() is not null then raise exception 'Other-game save leaked'; end if;
  v := public.put_signal_breach_expansion_save(0,payload);
  if v->>'status' <> 'saved' or v->'current'->>'revision' <> '1' then raise exception 'Initial save failed'; end if;
  v := public.put_signal_breach_expansion_save(0,payload);
  if v->>'status' <> 'conflict' then raise exception 'Stale write accepted'; end if;
  v := public.put_signal_breach_expansion_save(1,payload);
  if v->'current'->>'revision' <> '2' then raise exception 'Revision not incremented'; end if;
  begin
    perform public.put_signal_breach_expansion_save(2,payload || '{"contentRevision":"other"}');
    raise exception 'Wrong revision accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.put_signal_breach_expansion_save(2,payload || '{"clearedLevels":[26]}');
    raise exception 'Invalid progress accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform 1 from public.game_saves;
    raise exception 'Direct table read allowed';
  exception when insufficient_privilege then null; end;
end $$;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
do $$begin
  if public.get_signal_breach_expansion_save() is not null then raise exception 'Account save leaked'; end if;
end $$;
set request.jwt.claim.sub = '';
do $$begin
  begin perform public.get_signal_breach_expansion_save(); raise exception 'Missing auth accepted';
  exception when insufficient_privilege then null; end;
end $$;
set role anon;
do $$begin
  begin perform public.get_signal_breach_expansion_save(); raise exception 'Anonymous access accepted';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$begin
  if (select payload from public.game_saves where game_id='00000000-0000-0000-0000-000000000002') <> '{"sentinel":"unchanged"}'::jsonb then raise exception 'Other game changed'; end if;
  if exists(select 1 from pg_policies where schemaname='public' and tablename='game_saves') then raise exception 'Shared policies changed'; end if;
end $$;
select 'Save database isolation, grants, invalid input, CAS and sentinel preservation passed' as result;
