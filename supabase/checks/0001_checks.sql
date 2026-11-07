-- Checks for supabase/migrations/0001_schema.sql only.

-- 1.
-- EXPECT: 0 rows
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

-- 2.
-- EXPECT: 0 rows
select table_schema, table_name, privilege_type
from information_schema.role_table_grants
where grantee = 'anon'
  and table_schema = 'public';

-- 3.
-- EXPECT: 1 row, every_public_table_has_rls = true
select bool_and(c.relrowsecurity) as every_public_table_has_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r';

-- 4.
-- EXPECT: 1 row, public = false
select public
from storage.buckets
where id = 'farm-photos';
