-- 0002_seed.sql
-- Seed data: 8 stage templates, 2 season windows, 1 alert_settings row.
-- These are placeholders pending the owner's corrected timings and must be
-- kept identical to src/lib/schedule/defaults.ts.
-- Do NOT seed farms or recipients.

-- Season windows (matching defaults.ts: defaultSeasonWindows)
insert into public.season_windows (key, start_month, start_day, end_month, end_day) values
  ('dry_season', 11, 1,  3, 31),
  ('planting',    4, 25, 7, 15);

-- Stage templates (matching defaults.ts: defaultStageTemplates)
insert into public.stage_templates (position, name, trigger_type, window_key, offset_months) values
  (1, 'Land clearing (cut trees, gather weeds, isolate wood, burn weeds, clear log remnants)', 'season_window',  'dry_season', null),
  (2, 'Planting (acquire and plant seedlings)',                                                'season_window',  'planting',   null),
  (3, 'First round-weeding',                                                                  'after_planting', null,         3),
  (4, 'Herbicide on surrounding weeds',                                                       'after_planting', null,         3),
  (5, 'First fertilizer',                                                                     'after_planting', null,         4),
  (6, 'Second round-weeding',                                                                 'after_planting', null,         7),
  (7, 'Third round-weeding',                                                                  'after_planting', null,         11),
  (8, 'Second fertilizer',                                                                    'after_planting', null,         12);

-- Alert settings (matching defaults.ts: defaultAlertSettings, plus send_hour_london from PRODUCT.md)
insert into public.alert_settings (id, heads_up_days, reminder_days, overdue_enabled, overdue_repeat_days, send_hour_london)
values (true, 14, 3, true, 3, 8);
