-- 1. The setting exists and is required.
-- EXPECT: 1 row, is_nullable NO
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'alert_settings'
  AND column_name = 'done_notice_enabled';

-- 2. The seeded settings row receives the default value.
-- EXPECT: 1 row
SELECT done_notice_enabled
FROM public.alert_settings
WHERE id = true AND done_notice_enabled IS TRUE;

-- 3. Anonymous users retain no privileges on alert_settings.
-- EXPECT: 0 rows
SELECT privilege_type
FROM (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')) AS privileges(privilege_type)
WHERE has_table_privilege('anon', 'public.alert_settings', privilege_type);
