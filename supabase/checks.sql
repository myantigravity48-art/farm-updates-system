-- checks.sql
-- Original security checks for the initial schema. Migration-specific checks
-- live in supabase/checks/NNNN_checks.sql.

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
