begin;

-- This data migration must run before any farms have been created.
do $$
declare
  v_farm_count integer;
  v_herbicide_count integer;
  v_herbicide_id uuid;
  v_invalid_count integer;
  v_template_count integer;
  v_match_count integer;
  v_match_details text;
  v_all_templates text;
begin
  select count(*) into v_farm_count from public.farms;
  if v_farm_count > 0 then
    select coalesce(string_agg(format('position %s: %s (%s, offset %s)', position, name, trigger_type, offset_months), '; ' order by position), '<none>')
    into v_all_templates from public.stage_templates;
    raise exception using message = format('farms_exist: expected 0 farms, found %s. Templates found: %s.', v_farm_count, v_all_templates);
  end if;

  select count(*) into v_herbicide_count
  from public.stage_templates
  where trigger_type = 'after_planting'
    and offset_months = 3
    and name ilike '%herbicide%';

  if v_herbicide_count <> 1 then
    select coalesce(string_agg(format('%s (offset %s)', name, offset_months), ', ' order by position), '<none>')
    into v_match_details
    from public.stage_templates
    where trigger_type = 'after_planting'
      and offset_months = 3
      and name ilike '%herbicide%';

    raise exception using message = format(
      'herbicide_not_found: found %s matching templates: %s.',
      v_herbicide_count,
      v_match_details
    );
  end if;

  select id into v_herbicide_id
  from public.stage_templates
  where trigger_type = 'after_planting'
    and offset_months = 3
    and name ilike '%herbicide%';

  delete from public.farm_stages where template_id = v_herbicide_id;
  delete from public.stage_templates where id = v_herbicide_id;

  select count(*),
         coalesce(string_agg(format('%s (offset %s)', name, offset_months), ', ' order by position), '<none>')
  into v_match_count, v_match_details
  from public.stage_templates
  where trigger_type = 'after_planting'
    and offset_months = 3;

  if v_match_count <> 1 then
    raise exception using message = format(
      'stage_lifecycle_invalid: expected 1 after_planting template at offset 3; found %s: %s.',
      v_match_count,
      v_match_details
    );
  end if;

  select count(*),
         coalesce(string_agg(format('%s (offset %s)', name, offset_months), ', ' order by position), '<none>')
  into v_match_count, v_match_details
  from public.stage_templates
  where trigger_type = 'after_planting'
    and offset_months = 7;

  if v_match_count <> 1 then
    raise exception using message = format(
      'stage_lifecycle_invalid: expected 1 after_planting template at offset 7; found %s: %s.',
      v_match_count,
      v_match_details
    );
  end if;

  select count(*),
         coalesce(string_agg(format('%s (offset %s)', name, offset_months), ', ' order by position), '<none>')
  into v_match_count, v_match_details
  from public.stage_templates
  where trigger_type = 'after_planting'
    and offset_months = 11;

  if v_match_count <> 1 then
    raise exception using message = format(
      'stage_lifecycle_invalid: expected 1 after_planting template at offset 11; found %s: %s.',
      v_match_count,
      v_match_details
    );
  end if;

  select count(*),
         coalesce(string_agg(format('%s (offset %s)', name, offset_months), ', ' order by position), '<none>')
  into v_match_count, v_match_details
  from public.stage_templates
  where trigger_type = 'after_planting'
    and offset_months = 4;

  if v_match_count <> 1 then
    raise exception using message = format(
      'stage_lifecycle_invalid: expected 1 after_planting template at offset 4; found %s: %s.',
      v_match_count,
      v_match_details
    );
  end if;

  select count(*),
         coalesce(string_agg(format('%s (offset %s)', name, offset_months), ', ' order by position), '<none>')
  into v_match_count, v_match_details
  from public.stage_templates
  where trigger_type = 'after_planting'
    and offset_months = 12;

  if v_match_count <> 1 then
    raise exception using message = format(
      'stage_lifecycle_invalid: expected 1 after_planting template at offset 12; found %s: %s.',
      v_match_count,
      v_match_details
    );
  end if;

  with expected(trigger_type, window_key, anchor_window_key, offset_months, offset_days) as (
    values
      ('season_window'::text, 'dry_season'::text, null::text, null::integer, null::integer),
      ('after_stage_done'::text, null::text, 'dry_season'::text, null::integer, 0),
      ('season_window'::text, 'planting'::text, null::text, null::integer, null::integer),
      ('after_planting'::text, null::text, null::text, 3, null::integer),
      ('after_planting'::text, null::text, null::text, 4, null::integer),
      ('after_planting'::text, null::text, null::text, 7, null::integer),
      ('after_planting'::text, null::text, null::text, 11, null::integer),
      ('after_planting'::text, null::text, null::text, 12, null::integer)
  )
  select count(*) into v_invalid_count
  from expected e
  where (
    select count(*)
    from public.stage_templates t
    where t.trigger_type = e.trigger_type
      and t.window_key is not distinct from e.window_key
      and t.anchor_window_key is not distinct from e.anchor_window_key
      and t.offset_months is not distinct from e.offset_months
      and t.offset_days is not distinct from e.offset_days
  ) <> 1;

  if v_invalid_count <> 0 then
    select coalesce(string_agg(format('position %s: %s (%s, offset %s)', position, name, trigger_type, offset_months), '; ' order by position), '<none>')
    into v_all_templates from public.stage_templates;
    raise exception using message = format('stage_lifecycle_invalid: expected one match for each target trigger/key/offset rule; found %s invalid rules. Templates found: %s.', v_invalid_count, v_all_templates);
  end if;

  -- Move every row out of the target range before assigning unique positions.
  update public.stage_templates set position = position + 100;

  with target(position, trigger_type, window_key, anchor_window_key, offset_months, offset_days) as (
    values
      (1, 'season_window'::text, 'dry_season'::text, null::text, null::integer, null::integer),
      (2, 'after_stage_done'::text, null::text, 'dry_season'::text, null::integer, 0),
      (3, 'season_window'::text, 'planting'::text, null::text, null::integer, null::integer),
      (4, 'after_planting'::text, null::text, null::text, 3, null::integer),
      (5, 'after_planting'::text, null::text, null::text, 4, null::integer),
      (6, 'after_planting'::text, null::text, null::text, 7, null::integer),
      (7, 'after_planting'::text, null::text, null::text, 11, null::integer),
      (8, 'after_planting'::text, null::text, null::text, 12, null::integer)
  )
  update public.stage_templates t
  set position = target.position
  from target
  where t.trigger_type = target.trigger_type
    and t.window_key is not distinct from target.window_key
    and t.anchor_window_key is not distinct from target.anchor_window_key
    and t.offset_months is not distinct from target.offset_months
    and t.offset_days is not distinct from target.offset_days;

  update public.stage_templates
  set name = 'First round-weeding and herbicide',
      updated_at = now(),
      updated_by_name = 'System update'
  where trigger_type = 'after_planting'
    and offset_months = 3;

  update public.stage_templates
  set name = 'Second round-weeding and herbicide',
      updated_at = now(),
      updated_by_name = 'System update'
  where trigger_type = 'after_planting'
    and offset_months = 7;

  update public.stage_templates
  set name = 'Third round-weeding and herbicide',
      updated_at = now(),
      updated_by_name = 'System update'
  where trigger_type = 'after_planting'
    and offset_months = 11;

  select count(*) into v_template_count from public.stage_templates;

  with expected(position, trigger_type, window_key, anchor_window_key, offset_months, offset_days, renamed_name) as (
    values
      (1, 'season_window'::text, 'dry_season'::text, null::text, null::integer, null::integer, null::text),
      (2, 'after_stage_done'::text, null::text, 'dry_season'::text, null::integer, 0, null::text),
      (3, 'season_window'::text, 'planting'::text, null::text, null::integer, null::integer, null::text),
      (4, 'after_planting'::text, null::text, null::text, 3, null::integer, 'First round-weeding and herbicide'::text),
      (5, 'after_planting'::text, null::text, null::text, 4, null::integer, null::text),
      (6, 'after_planting'::text, null::text, null::text, 7, null::integer, 'Second round-weeding and herbicide'::text),
      (7, 'after_planting'::text, null::text, null::text, 11, null::integer, 'Third round-weeding and herbicide'::text),
      (8, 'after_planting'::text, null::text, null::text, 12, null::integer, null::text)
  )
  select count(*) into v_invalid_count
  from expected e
  left join public.stage_templates t on t.position = e.position
  where t.id is null
     or t.trigger_type is distinct from e.trigger_type
     or t.window_key is distinct from e.window_key
     or t.anchor_window_key is distinct from e.anchor_window_key
     or t.offset_months is distinct from e.offset_months
     or t.offset_days is distinct from e.offset_days
     or (e.renamed_name is not null and t.name is distinct from e.renamed_name);

  if v_template_count <> 8 or v_invalid_count <> 0 then
    select coalesce(string_agg(format('position %s: %s (%s, offset %s)', position, name, trigger_type, offset_months), '; ' order by position), '<none>')
    into v_all_templates from public.stage_templates;
    raise exception using message = format('stage_lifecycle_invalid: expected 8 templates in structural target order and renamed-stage labels; found %s templates and %s structural mismatches. Templates found: %s.', v_template_count, v_invalid_count, v_all_templates);
  end if;
end;
$$;

-- Use template positions as the source of truth for the first and last stages.
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
  v_lowest_position   int;
  v_highest_position  int;
  v_planting_position int;
begin
  if p_name is null or btrim(p_name) = '' then
    raise exception 'Farm name is required.' using errcode = '22023';
  end if;

  if p_anchor_date is null then
    raise exception 'Schedule anchor date is required.' using errcode = '22023';
  end if;

  select min(position), max(position)
  into v_lowest_position, v_highest_position
  from public.stage_templates;

  if v_lowest_position is null or v_highest_position is null then
    raise exception 'Stage templates are missing. Apply supabase/migrations/0002_seed.sql.' using errcode = '22023';
  end if;

  if p_current_position is null
     or p_current_position < v_lowest_position
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

  update public.farm_stages fs
  set is_done = true,
      done_by = auth.uid(),
      done_date = null,
      done_note = 'Marked done when the farm was added'
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
  v_count         int;
  v_index         int := 0;
  v_row           jsonb;
  v_name          text;
  v_location      text;
  v_size_value    numeric;
  v_size_unit     text;
  v_first_position int;
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

  select min(position) into v_first_position from public.stage_templates;
  if v_first_position is null then
    raise exception 'Stage templates are missing. Apply supabase/migrations/0002_seed.sql.' using errcode = '22023';
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
        v_first_position,
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

commit;
