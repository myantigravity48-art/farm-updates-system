-- 1. Function signature
-- EXPECT: 1 row
select n.nspname as schema_name, p.proname as function_name, pg_get_function_identity_arguments(p.oid) as arguments
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname='save_lifecycle' and p.prorettype='void'::regtype;

-- 2. Execute permissions
-- EXPECT: 1 row, authenticated
select case when has_function_privilege('authenticated','public.save_lifecycle(jsonb,jsonb,text)','EXECUTE') and not has_function_privilege('anon','public.save_lifecycle(jsonb,jsonb,text)','EXECUTE') and not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where n.nspname='public' and p.proname='save_lifecycle' and a.grantee=0 and a.privilege_type='EXECUTE') then 'authenticated' else 'incorrect' end as execute_role;

-- 3. Audit columns
-- EXPECT: 4 rows
select table_name,column_name,data_type,is_nullable
from information_schema.columns
where table_schema='public' and table_name in ('stage_templates','season_windows') and column_name in ('updated_at','updated_by_name')
order by table_name,column_name;

-- 5. February-fixed month helper
-- EXPECT: 1 row
select n.nspname as schema_name,p.proname as function_name,pg_get_function_identity_arguments(p.oid) as arguments
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname='lifecycle_days_in_month' and p.prorettype='integer'::regtype;

-- 4. Exact authenticated UPDATE column grants
-- EXPECT: 4 rows for stage_templates and 6 for season_windows, naming exactly the columns above
select table_name,column_name,privilege_type
from information_schema.column_privileges
where table_schema='public' and grantee='authenticated' and privilege_type='UPDATE' and table_name in ('stage_templates','season_windows')
order by table_name,column_name;
