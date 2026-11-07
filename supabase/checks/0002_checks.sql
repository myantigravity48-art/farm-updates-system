-- Checks for supabase/migrations/0002_seed.sql only.

-- 1.
-- EXPECT: 3 rows: stage_templates = 8, season_windows = 2, alert_settings = 1
select 'stage_templates' as tbl, count(*) from public.stage_templates
union all
select 'season_windows', count(*) from public.season_windows
union all
select 'alert_settings', count(*) from public.alert_settings;
