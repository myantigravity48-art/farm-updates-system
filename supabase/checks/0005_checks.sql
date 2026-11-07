-- Checks for supabase/migrations/0005_notes_photos_author.sql only.

-- 1.
-- EXPECT: 2 rows
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in ('notes', 'photos')
  and column_name = 'author_name'
order by table_name;

-- 2.
-- EXPECT: 2 rows
select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and indexname in ('notes_farm_created_at_idx', 'photos_farm_created_at_idx')
order by indexname;

-- 3.
-- EXPECT: 1 row
select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.photos'::regclass
  and conname = 'photos_storage_path_prefix_check';

-- 4.
-- EXPECT: 0 rows
select id, farm_id, storage_path
from public.photos
where left(storage_path, length(farm_id::text) + 1) <> farm_id::text || '/';
