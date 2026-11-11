-- 1. Alert type check
-- EXPECT: constraint definition includes 'window_open'
select pg_catalog.pg_get_constraintdef(oid) as definition
from pg_catalog.pg_constraint
where conrelid = 'public.notification_log'::regclass and conname = 'notification_log_alert_type_check';

-- 2. Status check
-- EXPECT: constraint definition includes 'pending'
select pg_catalog.pg_get_constraintdef(oid) as definition
from pg_catalog.pg_constraint
where conrelid = 'public.notification_log'::regclass and conname = 'notification_log_status_check';

-- 3. Claim and finish functions
-- EXPECT: 2 rows
select routine_name
from information_schema.routines
where routine_schema = 'public' and routine_name in ('claim_alert_rows', 'finish_alert_rows')
order by routine_name;

-- 4. Function execution grants
-- EXPECT: 2 rows, both service_role
select p.proname as routine_name,
       case when acl.grantee = 0 then 'public' else pg_catalog.pg_get_userbyid(acl.grantee) end as grantee
from pg_catalog.pg_proc as p
cross join lateral pg_catalog.aclexplode(coalesce(p.proacl, pg_catalog.acldefault('f', p.proowner))) as acl
where p.pronamespace = 'public'::regnamespace and p.proname in ('claim_alert_rows', 'finish_alert_rows')
  and acl.privilege_type = 'EXECUTE'
  and (acl.grantee = 0 or acl.grantee in (select oid from pg_catalog.pg_roles where rolname in ('anon', 'authenticated', 'service_role')))
  and case when acl.grantee = 0 then 'public' else pg_catalog.pg_get_userbyid(acl.grantee) end in ('public', 'anon', 'authenticated', 'service_role')
order by p.proname, grantee;

-- 5. Claim columns
-- EXPECT: 2 rows
select column_name
from information_schema.columns
where table_schema = 'public' and table_name = 'notification_log'
  and column_name in ('claimed_at', 'attempts')
order by column_name;
