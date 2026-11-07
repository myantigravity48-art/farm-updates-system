-- 1. Check the four Mark done functions exist.
-- EXPECT: 4 rows
select p.proname as function_name
from pg_catalog.pg_proc as p
join pg_catalog.pg_namespace as n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('mark_stage_done', 'undo_stage_done', 'set_planting_date', 'set_stage_due_override')
order by p.proname;

-- 2. Check only authenticated can execute the four functions.
-- EXPECT: 4 rows, all authenticated, none anon
select p.proname as function_name,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute
from pg_catalog.pg_proc as p
join pg_catalog.pg_namespace as n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('mark_stage_done', 'undo_stage_done', 'set_planting_date', 'set_stage_due_override')
order by p.proname;

-- 3. Check the captured completion name column exists.
-- EXPECT: 1 row
select column_name
from information_schema.columns
where table_schema = 'public' and table_name = 'farm_stages' and column_name = 'done_by_name';
