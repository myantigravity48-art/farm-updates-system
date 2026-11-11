-- 1. Phone column exists.
-- EXPECT: 1 row
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'recipients'
  and column_name = 'phone';

-- 2. Anonymous role has no table privileges on recipients.
-- EXPECT: 0 rows
select privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'recipients'
  and grantee = 'anon';

-- 3. Phone length constraint exists.
-- EXPECT: 1 row
select conname
from pg_catalog.pg_constraint
where conrelid = 'public.recipients'::regclass
  and conname = 'recipients_phone_length_check';
