alter table public.stage_templates add column updated_at timestamptz, add column updated_by_name text;
alter table public.season_windows add column updated_at timestamptz, add column updated_by_name text;

-- Preserve SELECT grants and the existing authenticated policies (including their anonymous-JWT exclusion).
revoke update on public.stage_templates, public.season_windows from authenticated;
grant update (name, offset_months, updated_at, updated_by_name) on public.stage_templates to authenticated;
grant update (start_month, start_day, end_month, end_day, updated_at, updated_by_name) on public.season_windows to authenticated;

create or replace function public.lifecycle_days_in_month(p_month integer)
returns integer language sql immutable security invoker set search_path = ''
as $$ select case when p_month = 2 then 28 when p_month in (4,6,9,11) then 30 else 31 end $$;
revoke execute on function public.lifecycle_days_in_month(integer) from public, anon;
grant execute on function public.lifecycle_days_in_month(integer) to authenticated;

create or replace function public.save_lifecycle(p_stages jsonb, p_windows jsonb, p_updated_by_name text)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_stage jsonb; v_window jsonb; v_id text; v_name text; v_month integer; v_day integer; v_expected integer;
begin
  if jsonb_typeof(p_stages) is distinct from 'array' then raise exception 'incomplete: stages must be an array'; end if;
  select count(*) into v_expected from public.stage_templates;
  if jsonb_array_length(p_stages) <> v_expected then raise exception 'incomplete: every stage is required'; end if;
  if exists(select 1 from jsonb_array_elements(p_stages) e(value) where jsonb_typeof(value) is distinct from 'object' or coalesce(value->>'id','') = '') then raise exception 'incomplete: malformed stage'; end if;
  if exists(select 1 from jsonb_array_elements(p_stages) e(value) group by value->>'id' having count(*) > 1) then raise exception 'incomplete: duplicate stage'; end if;
  for v_stage in select value from jsonb_array_elements(p_stages) e(value) loop
    v_id := v_stage->>'id';
    if not exists(select 1 from public.stage_templates t where t.id::text=v_id) then raise exception 'unknown_stage: id'; end if;
  end loop;
  if exists(select 1 from public.stage_templates t where not exists(select 1 from jsonb_array_elements(p_stages) e(value) where value->>'id'=t.id::text)) then raise exception 'incomplete: missing stage'; end if;
  for v_stage in select value from jsonb_array_elements(p_stages) e(value) loop
    v_name := btrim(coalesce(v_stage->>'name',''));
    if jsonb_typeof(v_stage->'name') is distinct from 'string' then raise exception 'bad_name: name must be text'; end if;
    if char_length(v_name) not between 1 and 60 then raise exception 'bad_name: name must contain 1 to 60 characters'; end if;
    if exists(select 1 from public.stage_templates t where t.id::text=v_stage->>'id' and t.trigger_type='after_planting') then
      if coalesce(v_stage->>'offset_months','') !~ '^(0|[1-9][0-9]*)$' then raise exception 'bad_offset: offset must be an integer'; end if;
      if (v_stage->>'offset_months')::integer not between 0 and 60 then raise exception 'bad_offset: offset outside range'; end if;
    elsif v_stage->'offset_months' is distinct from 'null'::jsonb then raise exception 'bad_offset: window stages require null offset'; end if;
  end loop;
  if exists(select 1 from jsonb_array_elements(p_stages) a(value) join jsonb_array_elements(p_stages) b(value) on a.value->>'id'<b.value->>'id' where lower(btrim(a.value->>'name'))=lower(btrim(b.value->>'name'))) then raise exception 'duplicate_name: names must be unique'; end if;

  if jsonb_typeof(p_windows) is distinct from 'array' then raise exception 'incomplete: windows'; end if;
  if jsonb_array_length(p_windows) <> 2 then raise exception 'incomplete: windows'; end if;
  if exists(select 1 from jsonb_array_elements(p_windows) e(value) where jsonb_typeof(value) is distinct from 'object' or value->>'key' not in ('dry_season','planting')) then raise exception 'incomplete: window keys'; end if;
  if (select count(distinct value->>'key') from jsonb_array_elements(p_windows) e(value)) <> 2 or not exists(select 1 from jsonb_array_elements(p_windows) e(value) where value->>'key'='dry_season') or not exists(select 1 from jsonb_array_elements(p_windows) e(value) where value->>'key'='planting') then raise exception 'incomplete: exact window keys required'; end if;
  for v_window in select value from jsonb_array_elements(p_windows) e(value) loop
    if coalesce(v_window->>'start_month','') !~ '^[0-9]+$' or coalesce(v_window->>'end_month','') !~ '^[0-9]+$' or coalesce(v_window->>'start_day','') !~ '^[0-9]+$' or coalesce(v_window->>'end_day','') !~ '^[0-9]+$' then raise exception 'bad_window: month and day must be integers'; end if;
    foreach v_month in array array[nullif(v_window->>'start_month','')::integer,nullif(v_window->>'end_month','')::integer] loop
      if v_month is null or v_month not between 1 and 12 then raise exception 'bad_window: month outside range'; end if;
    end loop;
    foreach v_day in array array[nullif(v_window->>'start_day','')::integer,nullif(v_window->>'end_day','')::integer] loop
      if v_day is null or v_day not between 1 and 31 then raise exception 'bad_window: day outside range'; end if;
    end loop;
    if (v_window->>'start_day')::integer > public.lifecycle_days_in_month((v_window->>'start_month')::integer)
       or (v_window->>'end_day')::integer > public.lifecycle_days_in_month((v_window->>'end_month')::integer) then raise exception 'bad_window: day does not exist'; end if;
  end loop;
  update public.stage_templates t set name=btrim(s.value->>'name'), offset_months=nullif(s.value->>'offset_months','null')::integer, updated_at=now(), updated_by_name=p_updated_by_name from jsonb_array_elements(p_stages) s(value) where t.id::text=s.value->>'id';
  update public.season_windows w set start_month=(s.value->>'start_month')::integer,start_day=(s.value->>'start_day')::integer,end_month=(s.value->>'end_month')::integer,end_day=(s.value->>'end_day')::integer,updated_at=now(),updated_by_name=p_updated_by_name from jsonb_array_elements(p_windows) s(value) where w.key=s.value->>'key';
end; $$;
revoke execute on function public.save_lifecycle(jsonb,jsonb,text) from public, anon;
grant execute on function public.save_lifecycle(jsonb,jsonb,text) to authenticated;
