-- 1. Confirm the target lifecycle order, names, triggers, keys, and offsets.
-- EXPECT: 8 rows in order:
-- (1, Land clearing, season_window, dry_season, null, null, null);
-- (2, Order seedlings, after_stage_done, null, dry_season, null, 0);
-- (3, Planting, season_window, planting, null, null, null);
-- (4, First round-weeding and herbicide, after_planting, null, null, 3, null);
-- (5, First fertilizer, after_planting, null, null, 4, null);
-- (6, Second round-weeding and herbicide, after_planting, null, null, 7, null);
-- (7, Third round-weeding and herbicide, after_planting, null, null, 11, null);
-- (8, Second fertilizer, after_planting, null, null, 12, null).
select position, name, trigger_type, window_key, anchor_window_key, offset_months, offset_days
from public.stage_templates
order by position;

-- 2. Confirm the separate Herbicide stage has been removed.
-- EXPECT: 0 rows.
select id, position, name
from public.stage_templates
where lower(name) = 'herbicide';

-- 3. Confirm template positions are exactly 1 through 8 with no gaps or duplicates.
-- EXPECT: 1 row, template_count = 8, minimum_position = 1, maximum_position = 8, distinct_positions = 8.
select count(*) as template_count,
       min(position) as minimum_position,
       max(position) as maximum_position,
       count(distinct position) as distinct_positions
from public.stage_templates;

-- 4. Confirm every farm has exactly 8 stage rows.
-- EXPECT: 0 rows.
select f.id as farm_id, count(fs.id) as stage_count
from public.farms f
left join public.farm_stages fs on fs.farm_id = f.id
group by f.id
having count(fs.id) <> 8;
