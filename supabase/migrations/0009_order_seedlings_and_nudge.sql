begin;

alter table public.stage_templates add column if not exists anchor_window_key text;
alter table public.stage_templates add column if not exists offset_days integer;
alter table public.stage_templates drop constraint if exists stage_templates_trigger_check;
alter table public.stage_templates drop constraint if exists stage_templates_trigger_type_check;
alter table public.stage_templates add constraint stage_templates_trigger_type_check
  check (trigger_type in ('season_window', 'after_planting', 'after_stage_done'));
alter table public.stage_templates add constraint stage_templates_trigger_check check (
  (trigger_type = 'season_window' and window_key is not null and offset_months is null and offset_days is null and anchor_window_key is null) or
  (trigger_type = 'after_planting' and window_key is null and offset_months is not null and offset_days is null and anchor_window_key is null) or
  (trigger_type = 'after_stage_done' and window_key is null and offset_months is null and anchor_window_key is not null and anchor_window_key in ('dry_season', 'planting') and offset_days is not null and offset_days between 0 and 365)
);

do $$
begin
  if not exists (select 1 from public.stage_templates where name = 'Order seedlings') then
    update public.stage_templates set position = position + 100 where position >= 2;
    update public.stage_templates set position = position - 99 where position >= 102;
    insert into public.stage_templates(position, name, trigger_type, anchor_window_key, offset_days)
    values (2, 'Order seedlings', 'after_stage_done', 'dry_season', 0);
  end if;
end;
$$;

insert into public.farm_stages(farm_id, template_id, is_done, done_date)
select f.id, ordered.id, coalesce(planting.is_done, false), null
from public.farms f
cross join public.stage_templates ordered
left join public.stage_templates planting_template on planting_template.window_key = 'planting'
left join public.farm_stages planting on planting.farm_id = f.id and planting.template_id = planting_template.id
where ordered.name = 'Order seedlings'
on conflict (farm_id, template_id) do nothing;

revoke update on public.stage_templates from authenticated;
grant update (name, offset_months, offset_days, updated_at, updated_by_name) on public.stage_templates to authenticated;

create or replace function public.save_lifecycle(p_stages jsonb, p_windows jsonb, p_updated_by_name text)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_stage jsonb; v_window jsonb; v_id text; v_name text; v_month integer; v_day integer; v_expected integer; v_offset_days integer;
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
      if (v_stage->>'offset_months')::integer not between 0 and 60 or v_stage->'offset_days' is distinct from 'null'::jsonb then raise exception 'bad_offset: offset outside range'; end if;
    elsif exists(select 1 from public.stage_templates t where t.id::text=v_stage->>'id' and t.trigger_type='after_stage_done') then
      if jsonb_typeof(v_stage->'offset_days') is distinct from 'number' or coalesce(v_stage->>'offset_days','') !~ '^(0|[1-9][0-9]*)$' or length(v_stage->>'offset_days') > 3 then raise exception 'bad_offset: days must be an integer'; end if;
      v_offset_days := (v_stage->>'offset_days')::integer;
      if v_offset_days not between 0 and 365 then raise exception 'bad_offset: days outside range'; end if;
      if v_stage->'offset_months' is distinct from 'null'::jsonb then raise exception 'bad_offset: after-stage stages require null months'; end if;
    elsif v_stage->'offset_months' is distinct from 'null'::jsonb or v_stage->'offset_days' is distinct from 'null'::jsonb then raise exception 'bad_offset: window stages require null offsets'; end if;
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
    if (v_window->>'start_day')::integer > public.lifecycle_days_in_month((v_window->>'start_month')::integer) or (v_window->>'end_day')::integer > public.lifecycle_days_in_month((v_window->>'end_month')::integer) then raise exception 'bad_window: day does not exist'; end if;
  end loop;
  update public.stage_templates t set name=btrim(s.value->>'name'), offset_months=nullif(s.value->>'offset_months','null')::integer, offset_days=nullif(s.value->>'offset_days','null')::integer, updated_at=now(), updated_by_name=p_updated_by_name from jsonb_array_elements(p_stages) s(value) where t.id::text=s.value->>'id';
  update public.season_windows w set start_month=(s.value->>'start_month')::integer,start_day=(s.value->>'start_day')::integer,end_month=(s.value->>'end_month')::integer,end_day=(s.value->>'end_day')::integer,updated_at=now(),updated_by_name=p_updated_by_name from jsonb_array_elements(p_windows) s(value) where w.key=s.value->>'key';
end; $$;
revoke execute on function public.save_lifecycle(jsonb,jsonb,text) from public, anon;
grant execute on function public.save_lifecycle(jsonb,jsonb,text) to authenticated;

alter table public.alert_settings add column if not exists window_nudge_days integer not null default 14 check (window_nudge_days between 0 and 60);
alter table public.notification_log drop constraint if exists notification_log_alert_type_check;
alter table public.notification_log add constraint notification_log_alert_type_check check (alert_type in ('heads_up', 'reminder', 'overdue', 'window_open', 'done_notice'));
alter table public.alert_settings alter column overdue_repeat_days set default 7;
update public.alert_settings set overdue_repeat_days=7 where id=true and overdue_repeat_days=3;

create or replace function public.mark_stage_done(p_farm_stage_id uuid,p_done_date date,p_note text,p_done_by_name text,p_today date)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_farm_id uuid; v_trigger_type text; v_planting_date date; v_anchor_window_key text; v_anchor_done_date date;
begin
  if p_done_date is null or p_today is null then raise exception 'invalid_date: completion date is required'; end if;
  if p_done_date > p_today then raise exception 'future_date: completion date cannot be in the future'; end if;
  if p_done_date < date '2000-01-01' then raise exception 'invalid_date: completion date is too early'; end if;
  if length(coalesce(trim(p_note), '')) > 1000 then raise exception 'invalid_note: note is too long'; end if;
  update public.farm_stages as fs set is_done=true,done_date=p_done_date,done_note=nullif(trim(p_note),''),done_by=auth.uid(),done_by_name=nullif(trim(p_done_by_name),'') where fs.id=p_farm_stage_id and fs.is_done=false returning fs.farm_id into v_farm_id;
  if not found then raise exception 'already_done: stage is already done or not found'; end if;
  select st.trigger_type, st.anchor_window_key into v_trigger_type, v_anchor_window_key from public.farm_stages fs join public.stage_templates st on st.id=fs.template_id where fs.id=p_farm_stage_id;
  if v_trigger_type='after_planting' then
    select f.planting_date into v_planting_date from public.farms f where f.id=v_farm_id;
    if v_planting_date is not null and p_done_date<v_planting_date then raise exception 'before_planting: completion date is before planting'; end if;
  elsif v_trigger_type='after_stage_done' then
    select anchor.done_date into v_anchor_done_date from public.farm_stages anchor join public.stage_templates anchor_template on anchor_template.id=anchor.template_id where anchor.farm_id=v_farm_id and anchor_template.window_key=v_anchor_window_key and anchor.is_done=true;
    if v_anchor_done_date is not null and p_done_date<v_anchor_done_date then raise exception 'before_anchor: completion date is before anchor'; end if;
  end if;
  if exists(select 1 from public.farm_stages fs join public.stage_templates st on st.id=fs.template_id where fs.id=p_farm_stage_id and st.window_key='planting') then update public.farms set planting_date=p_done_date where id=v_farm_id; end if;
end; $$;

create or replace function public.undo_stage_done(p_farm_stage_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_farm_id uuid;
begin
  select fs.farm_id into v_farm_id from public.farm_stages fs where fs.id=p_farm_stage_id and fs.is_done=true;
  if not found then raise exception 'not_done: stage is not done or not found'; end if;
  if exists(select 1 from public.farm_stages target join public.stage_templates anchor_template on anchor_template.id=target.template_id join public.farm_stages later on later.farm_id=target.farm_id and later.is_done=true join public.stage_templates later_template on later_template.id=later.template_id where target.id=p_farm_stage_id and anchor_template.window_key=later_template.anchor_window_key and later_template.trigger_type='after_stage_done') then raise exception 'later_stages_done: later stages are still done'; end if;
  if exists(select 1 from public.farm_stages planting join public.stage_templates planting_template on planting_template.id=planting.template_id where planting.farm_id=v_farm_id and planting.id=p_farm_stage_id and planting_template.window_key='planting') then
    if exists(select 1 from public.farm_stages fs join public.stage_templates st on st.id=fs.template_id where fs.farm_id=v_farm_id and fs.is_done=true and st.trigger_type='after_planting') then raise exception 'later_stages_done: later stages are still done'; end if;
  end if;
  update public.farm_stages set is_done=false,done_date=null,done_note=null,done_by=null,done_by_name=null where id=p_farm_stage_id;
  if exists(select 1 from public.stage_templates st join public.farm_stages fs on fs.template_id=st.id where fs.id=p_farm_stage_id and st.window_key='planting') then update public.farms set planting_date=null where id=v_farm_id; end if;
end; $$;
revoke execute on function public.mark_stage_done(uuid,date,text,text,date), public.undo_stage_done(uuid) from public, anon;
grant execute on function public.mark_stage_done(uuid,date,text,text,date), public.undo_stage_done(uuid) to authenticated;

commit;
