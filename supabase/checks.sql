-- checks.sql
-- Run each query in the Supabase SQL Editor to verify the schema.

-- 1. Tables with RLS disabled (expect zero rows)
select schemaname, tablename
from pg_tables
where schemaname = 'public'
  and tablename not in (
    select tablename from pg_tables where schemaname = 'public'
    intersect
    select relname from pg_class
    join pg_namespace on pg_namespace.oid = pg_class.relnamespace
    where pg_namespace.nspname = 'public' and pg_class.relrowsecurity = true
  );

-- 2. Any table privileges granted to anon (expect zero rows)
select table_schema, table_name, privilege_type
from information_schema.role_table_grants
where grantee = 'anon'
  and table_schema = 'public';

-- 3. RLS policies per table
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 4. Storage bucket public flag (expect false)
select id, name, public
from storage.buckets
where id = 'farm-photos';

-- 5. Row counts (expect 8 stage_templates, 2 season_windows, 1 alert_settings)
select 'stage_templates' as tbl, count(*) from public.stage_templates
union all
select 'season_windows',        count(*) from public.season_windows
union all
select 'alert_settings',        count(*) from public.alert_settings;

-- 6. Farm functions exist (expect 2 rows)
select n.nspname as schema_name,
       p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('create_farm', 'create_farms_bulk')
order by p.proname;

-- 7. anon and public cannot execute the farm functions (expect zero rows)
select routine_schema, routine_name, grantee, privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name in ('create_farm', 'create_farms_bulk')
  and grantee in ('anon', 'PUBLIC');

-- 8. anon cannot execute either farm function (expect false, false)
select has_function_privilege(
         'anon',
         'public.create_farm(text,text,numeric,text,text,int,date,date)',
         'execute'
       ) as anon_can_create_farm,
       has_function_privilege(
         'anon',
         'public.create_farms_bulk(jsonb,date)',
         'execute'
       ) as anon_can_create_farms_bulk;
