alter table public.farm_stages
  add column done_by_name text;

create or replace function public.mark_stage_done(
  p_farm_stage_id uuid,
  p_done_date date,
  p_note text,
  p_done_by_name text,
  p_today date
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_farm_id uuid;
  v_trigger_type text;
  v_planting_date date;
begin
  if p_done_date is null or p_today is null then
    raise exception 'invalid_date: completion date is required';
  end if;
  if p_done_date > p_today then
    raise exception 'future_date: completion date cannot be in the future';
  end if;
  if p_done_date < date '2000-01-01' then
    raise exception 'invalid_date: completion date is too early';
  end if;
  if length(coalesce(trim(p_note), '')) > 1000 then
    raise exception 'invalid_note: note is too long';
  end if;

  update public.farm_stages as fs
  set is_done = true,
      done_date = p_done_date,
      done_note = nullif(trim(p_note), ''),
      done_by = auth.uid(),
      done_by_name = nullif(trim(p_done_by_name), '')
  where fs.id = p_farm_stage_id
    and fs.is_done = false
  returning fs.farm_id into v_farm_id;

  if not found then
    raise exception 'already_done: stage is already done or not found';
  end if;

  select st.trigger_type into v_trigger_type
  from public.farm_stages as fs
  join public.stage_templates as st on st.id = fs.template_id
  where fs.id = p_farm_stage_id;

  if v_trigger_type = 'after_planting' then
    select f.planting_date into v_planting_date
    from public.farms as f where f.id = v_farm_id;
    if v_planting_date is not null and p_done_date < v_planting_date then
      raise exception 'before_planting: completion date is before planting';
    end if;
  end if;

  if exists (
    select 1
    from public.farm_stages as fs
    join public.stage_templates as st on st.id = fs.template_id
    where fs.id = p_farm_stage_id and st.window_key = 'planting'
  ) then
    update public.farms as f set planting_date = p_done_date
    where f.id = v_farm_id;
  end if;
end;
$$;

create or replace function public.undo_stage_done(p_farm_stage_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_farm_id uuid;
begin
  select fs.farm_id into v_farm_id
  from public.farm_stages as fs
  where fs.id = p_farm_stage_id and fs.is_done = true;

  if not found then
    raise exception 'not_done: stage is not done or not found';
  end if;

  if exists (
    select 1 from public.farm_stages as planting
    join public.stage_templates as planting_template on planting_template.id = planting.template_id
    where planting.farm_id = v_farm_id and planting.id = p_farm_stage_id
      and planting_template.window_key = 'planting'
  ) then
    if exists (
      select 1
      from public.farm_stages as fs
      join public.stage_templates as st on st.id = fs.template_id
      where fs.farm_id = v_farm_id and fs.is_done = true
        and st.trigger_type = 'after_planting'
    ) then
      raise exception 'later_stages_done: later stages are still done';
    end if;
  end if;

  update public.farm_stages as fs
  set is_done = false, done_date = null, done_note = null,
      done_by = null, done_by_name = null
  where fs.id = p_farm_stage_id;

  if exists (
    select 1 from public.stage_templates as st
    join public.farm_stages as fs on fs.template_id = st.id
    where fs.id = p_farm_stage_id and st.window_key = 'planting'
  ) then
    update public.farms as f set planting_date = null where f.id = v_farm_id;
  end if;
end;
$$;

create or replace function public.set_planting_date(
  p_farm_id uuid,
  p_date date,
  p_today date
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_planting_stage_id uuid;
begin
  if p_date is null or p_today is null then
    raise exception 'invalid_date: planting date is required';
  end if;
  if p_date > p_today then
    raise exception 'future_date: planting date cannot be in the future';
  end if;
  if p_date < date '2000-01-01' then
    raise exception 'invalid_date: planting date is too early';
  end if;

  select fs.id into v_planting_stage_id
  from public.farm_stages as fs
  join public.stage_templates as st on st.id = fs.template_id
  where fs.farm_id = p_farm_id and st.window_key = 'planting' and fs.is_done = true;

  if v_planting_stage_id is null then
    raise exception 'planting_not_done: planting must be marked done first';
  end if;

  if exists (
    select 1
    from public.farm_stages as fs
    join public.stage_templates as st on st.id = fs.template_id
    where fs.farm_id = p_farm_id and fs.is_done = true
      and st.trigger_type = 'after_planting' and fs.done_date < p_date
  ) then
    raise exception 'before_planting: a completed later stage is before this date';
  end if;

  update public.farms set planting_date = p_date where id = p_farm_id;
  update public.farm_stages set done_date = p_date where id = v_planting_stage_id;
end;
$$;

create or replace function public.set_stage_due_override(
  p_farm_stage_id uuid,
  p_date date
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_date is not null and (p_date < date '2020-01-01' or p_date > date '2100-12-31') then
    raise exception 'invalid_date: override date is outside the supported range';
  end if;

  update public.farm_stages as fs
  set due_date_override = p_date
  where fs.id = p_farm_stage_id and fs.is_done = false;

  if not found then
    raise exception 'already_done: stage is already done or not found';
  end if;
end;
$$;

revoke execute on function public.mark_stage_done(uuid, date, text, text, date) from public, anon;
revoke execute on function public.undo_stage_done(uuid) from public, anon;
revoke execute on function public.set_planting_date(uuid, date, date) from public, anon;
revoke execute on function public.set_stage_due_override(uuid, date) from public, anon;
grant execute on function public.mark_stage_done(uuid, date, text, text, date) to authenticated;
grant execute on function public.undo_stage_done(uuid) to authenticated;
grant execute on function public.set_planting_date(uuid, date, date) to authenticated;
grant execute on function public.set_stage_due_override(uuid, date) to authenticated;
