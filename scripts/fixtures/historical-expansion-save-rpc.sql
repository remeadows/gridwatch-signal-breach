-- HISTORICAL TEST FIXTURE ONLY. Never apply to GridWatchGamesDB.
-- The released game uses Nexus/account-kit saves with strict schema validation
-- and a 65,536-byte whole-request limit; these old RPCs are not that contract.
-- Preserved solely for disposable-database prototype regression tests.
-- Additive Signal Breach-only access to the existing shared save store.
-- No grants/policies/rows on game_saves or other games are changed.
-- Prerequisite: the shared game_saves schema owned by the account/save rollout.
-- Transaction ownership belongs to the migration runner.

create function public.get_signal_breach_expansion_save()
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_result jsonb;
begin
  if v_user is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select jsonb_build_object('revision', s.revision, 'save', s.payload) into v_result
  from public.game_saves s join public.games g on g.id = s.game_id
  where s.user_id = v_user and g.slug = 'gridwatch-signal-breach'
    and s.slot = 'expansion-1-r4';
  return v_result;
end;
$$;

create function public.put_signal_breach_expansion_save(p_base_revision bigint, p_payload jsonb)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_game uuid;
  v_row public.game_saves%rowtype;
  v_status text;
begin
  if v_user is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_base_revision is null or p_base_revision < 0 or p_base_revision >= 9007199254740991 then
    raise exception 'Invalid save revision' using errcode = '22023';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) is distinct from 'object'
    or octet_length(p_payload::text) > 131072
    or p_payload->'schema' is distinct from '1'::jsonb
    or p_payload->>'contentRevision' is distinct from 'expansion-1-r4'
    or jsonb_typeof(p_payload->'clearedLevels') is distinct from 'array'
    or jsonb_typeof(p_payload->'settings') is distinct from 'object'
    or jsonb_typeof(p_payload->'settings'->'lowEffects') is distinct from 'boolean'
    or not (p_payload ? 'checkpoint') then
    raise exception 'Invalid expansion save' using errcode = '22023';
  end if;
  if jsonb_array_length(p_payload->'clearedLevels') > 25 or exists (
    select 1 from jsonb_array_elements(p_payload->'clearedLevels') x
    where x not in (select to_jsonb(n) from generate_series(1, 25) n)
  ) or jsonb_typeof(p_payload->'checkpoint') not in ('null', 'object') then
    raise exception 'Invalid expansion save progress' using errcode = '22023';
  end if;
  select id into strict v_game from public.games where slug = 'gridwatch-signal-breach';
  select * into v_row from public.game_saves
    where user_id = v_user and game_id = v_game and slot = 'expansion-1-r4'
    for update;
  if found then
    if v_row.revision <> p_base_revision then
      v_status := 'conflict';
    else
      update public.game_saves set payload = p_payload, schema_version = 1,
        revision = revision + 1, updated_at = now()
        where user_id = v_user and game_id = v_game and slot = 'expansion-1-r4'
        returning * into v_row;
      v_status := 'saved';
    end if;
  else
    if p_base_revision <> 0 then raise exception 'Save was reset; reload before writing' using errcode = '40001'; end if;
    insert into public.game_saves(user_id, game_id, slot, schema_version, revision, payload)
      values(v_user, v_game, 'expansion-1-r4', 1, 1, p_payload)
      on conflict (user_id, game_id, slot) do nothing returning * into v_row;
    if found then v_status := 'saved';
    else
      select * into strict v_row from public.game_saves
        where user_id = v_user and game_id = v_game and slot = 'expansion-1-r4';
      v_status := 'conflict';
    end if;
  end if;
  return jsonb_build_object('status', v_status, 'current',
    jsonb_build_object('revision', v_row.revision, 'save', v_row.payload));
end;
$$;

revoke all on function public.get_signal_breach_expansion_save() from public, anon;
revoke all on function public.put_signal_breach_expansion_save(bigint, jsonb) from public, anon;
grant execute on function public.get_signal_breach_expansion_save() to authenticated;
grant execute on function public.put_signal_breach_expansion_save(bigint, jsonb) to authenticated;
