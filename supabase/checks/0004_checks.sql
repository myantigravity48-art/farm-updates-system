-- Checks for supabase/migrations/0004_farm_functions.sql only.

-- 1.
-- EXPECT: 2 rows
select n.nspname as schema_name,
       p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('create_farm', 'create_farms_bulk')
order by p.proname;

-- 2.
-- EXPECT: 0 rows
select routine_schema, routine_name, grantee, privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name in ('create_farm', 'create_farms_bulk')
  and grantee in ('anon', 'PUBLIC');

-- 3.
-- EXPECT: 1 row, anon_can_create_farm = false, anon_can_create_farms_bulk = false
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
