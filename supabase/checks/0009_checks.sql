-- 1. Stage templates in lifecycle order
-- EXPECT: 9 rows; position 2 is Order seedlings with trigger_type after_stage_done
select position, name, trigger_type, window_key, anchor_window_key, offset_months, offset_days
from public.stage_templates
order by position;

-- 2. Every farm has one farm_stages row per template
-- EXPECT: 0 rows
select f.id, f.name, count(fs.id) as stage_count, (select count(*) from public.stage_templates) as template_count
from public.farms f
left join public.farm_stages fs on fs.farm_id = f.id
group by f.id, f.name
having count(fs.id) <> (select count(*) from public.stage_templates);

-- 3. Exact authenticated UPDATE columns on stage_templates
-- EXPECT: 5 rows: name, offset_days, offset_months, updated_at, updated_by_name
select column_name
from information_schema.column_privileges
where table_schema = 'public' and table_name = 'stage_templates'
  and grantee = 'authenticated' and privilege_type = 'UPDATE'
order by column_name;

-- 4. Alert settings columns and defaults
-- EXPECT: 6 rows; window_nudge_days is NOT NULL DEFAULT 14 and overdue_repeat_days DEFAULT 7
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'alert_settings'
  and column_name in ('heads_up_days', 'reminder_days', 'overdue_enabled', 'overdue_repeat_days', 'window_nudge_days', 'send_hour_london')
order by column_name;

-- 5. Lifecycle and stage action function execution permissions
-- EXPECT: 3 rows, each reports authenticated=true and anon=false
select p.proname as function_name,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and ((p.proname = 'save_lifecycle' and pg_get_function_identity_arguments(p.oid) = 'p_stages jsonb, p_windows jsonb, p_updated_by_name text')
    or (p.proname = 'mark_stage_done' and pg_get_function_identity_arguments(p.oid) = 'p_farm_stage_id uuid, p_done_date date, p_note text, p_done_by_name text, p_today date')
    or (p.proname = 'undo_stage_done' and pg_get_function_identity_arguments(p.oid) = 'p_farm_stage_id uuid'))
order by p.proname;
