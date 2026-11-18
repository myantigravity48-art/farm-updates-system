-- 1. Confirm the lifecycle structure and only the three names set by migration 0013.
-- EXPECT: 1 row, template_count = 8, positions 1..8 structurally match target; renamed_name_mismatches = 0.
with expected(position, trigger_type, window_key, anchor_window_key, offset_months, offset_days, renamed_name) as (
  values
    (1, 'season_window', 'dry_season', null, null, null, null),
    (2, 'after_stage_done', null, 'dry_season', null, 0, null),
    (3, 'season_window', 'planting', null, null, null, null),
    (4, 'after_planting', null, null, 3, null, 'First round-weeding and herbicide'),
    (5, 'after_planting', null, null, 4, null, null),
    (6, 'after_planting', null, null, 7, null, 'Second round-weeding and herbicide'),
    (7, 'after_planting', null, null, 11, null, 'Third round-weeding and herbicide'),
    (8, 'after_planting', null, null, 12, null, null)
)
select count(*) as template_count,
       count(*) filter (where t.position = e.position
         and t.trigger_type = e.trigger_type
         and t.window_key is not distinct from e.window_key
         and t.anchor_window_key is not distinct from e.anchor_window_key
         and t.offset_months is not distinct from e.offset_months
         and t.offset_days is not distinct from e.offset_days) as structurally_matching,
       count(*) filter (where e.renamed_name is not null and t.name is distinct from e.renamed_name) as renamed_name_mismatches
from expected e
join public.stage_templates t on t.position = e.position;

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
