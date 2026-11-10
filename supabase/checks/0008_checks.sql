-- 1. No stage name exceeds the editor limit or is blank
-- EXPECT: 0 rows
select position, name from public.stage_templates where length(name) > 60 or length(btrim(name)) < 1;
