-- 0004_farm_functions.sql
-- Transactional farm-creation functions.
-- Both functions are SECURITY INVOKER, so row-level security and auth.uid()
-- still apply to the signed-in user. Apply after 0001 and 0002.

-- ---------------------------------------------------------------------------
-- create_farm
-- Creates a farm, marks every stage before the current position as done, and
-- sets the planting stage's done date when planting is already behind the farm.
-- ---------------------------------------------------------------------------
create or replace function public.create_farm(
  p_name             text,
  p_location         text,
  p_size_value       numeric,
  p_size_unit        text,
  p_notes            text,
  p_current_position int,
  p_planting_date    date,
  p_anchor_date      date
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_farm_id           uuid;
  v_highest_position  int;
  v_planting_position int;
begin
  if p_name is null or btrim(p_name) = '' then
    raise exception 'Farm name is required.' using errcode = '22023';
  end if;

  if p_anchor_date is null then
    raise exception 'Schedule anchor date is required.' using errcode = '22023';
  end if;

  select max(position) into v_highest_position
  from public.stage_templates;

  if v_highest_position is null then
    raise exception 'Stage templates are missing. Apply supabase/migrations/0002_seed.sql.' using errcode = '22023';
  end if;

  if p_current_position is null
     or p_current_position < 1
     or p_current_position > v_highest_position then
    raise exception 'Choose where the farm is in the process.' using errcode = '22023';
  end if;

  select position into v_planting_position
  from public.stage_templates
  where window_key = 'planting';

  if v_planting_position is null then
    raise exception 'The planting stage is missing from stage templates.' using errcode = '22023';
  end if;

  if p_current_position > v_planting_position then
    if p_planting_date is null then
      raise exception 'Planting date is required when the farm is past planting.' using errcode = '22023';
    end if;
  else
    if p_planting_date is not null then
      raise exception 'Planting date must be empty until the farm is past planting.' using errcode = '22023';
    end if;
  end if;

  insert into public.farms (
    name,
    location,
    size_value,
    size_unit,
    planting_date,
    schedule_anchor_date,
    notes
  )
  values (
    btrim(p_name),
    nullif(btrim(p_location), ''),
    p_size_value,
    nullif(btrim(p_size_unit), ''),
    p_planting_date,
    p_anchor_date,
    nullif(btrim(p_notes), '')
  )
  returning id into v_farm_id;

  -- The auto-create trigger has now inserted one farm_stages row per template.
  update public.farm_stages fs
  set is_done    = true,
      done_by    = auth.uid(),
      done_date  = null,
      done_note  = 'Marked done when the farm was added'
  from public.stage_templates st
  where fs.farm_id = v_farm_id
    and fs.template_id = st.id
    and st.position < p_current_position;

  if p_current_position > v_planting_position then
    update public.farm_stages fs
    set done_date = p_planting_date
    from public.stage_templates st
    where fs.farm_id = v_farm_id
      and fs.template_id = st.id
      and st.position = v_planting_position;
  end if;

  return v_farm_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- create_farms_bulk
-- Creates one farm per row at position 1 (not started). All or nothing.
-- ---------------------------------------------------------------------------
create or replace function public.create_farms_bulk(
  p_rows        jsonb,
  p_anchor_date date
)
returns int
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_count      int;
  v_index      int := 0;
  v_row        jsonb;
  v_name       text;
  v_location   text;
  v_size_value numeric;
  v_size_unit  text;
begin
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'Rows must be a list of farms.' using errcode = '22023';
  end if;

  v_count := jsonb_array_length(p_rows);

  if v_count = 0 then
    raise exception 'Add at least one farm.' using errcode = '22023';
  end if;

  if v_count > 100 then
    raise exception 'Add 100 farms or fewer at a time.' using errcode = '22023';
  end if;

  for v_row in select * from jsonb_array_elements(p_rows) loop
    v_index := v_index + 1;

    v_name := nullif(btrim(coalesce(v_row ->> 'name', '')), '');
    v_location := nullif(btrim(coalesce(v_row ->> 'location', '')), '');
    v_size_unit := nullif(btrim(coalesce(v_row ->> 'size_unit', '')), '');
    v_size_value := case
      when nullif(btrim(coalesce(v_row ->> 'size_value', '')), '') is null then null
      else (v_row ->> 'size_value')::numeric
    end;

    begin
      perform public.create_farm(
        v_name,
        v_location,
        v_size_value,
        v_size_unit,
        null,
        1,
        null,
        p_anchor_date
      );
    exception when unique_violation then
      raise exception 'row %: a farm with that name already exists', v_index
        using errcode = '23505';
    end;
  end loop;

  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants: no anon or public execution, authenticated only.
-- ---------------------------------------------------------------------------
revoke all on function public.create_farm(text, text, numeric, text, text, int, date, date)
  from public, anon;
revoke all on function public.create_farms_bulk(jsonb, date)
  from public, anon;

grant execute on function public.create_farm(text, text, numeric, text, text, int, date, date)
  to authenticated;
grant execute on function public.create_farms_bulk(jsonb, date)
  to authenticated;
