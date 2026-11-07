-- 0005_notes_photos_author.sql
-- Farm detail: author display names, newest-first indexes, and a storage path guard.
-- Apply this after 0004, then run supabase/checks/0005_checks.sql.

-- ---------------------------------------------------------------------------
-- author_name: the display name captured when the note or photo was added.
-- Nullable so existing rows stay valid and a deleted user leaves the text.
-- ---------------------------------------------------------------------------
alter table public.notes  add column if not exists author_name text;
alter table public.photos add column if not exists author_name text;

-- ---------------------------------------------------------------------------
-- Newest-first reads for the farm detail page (limit 50 notes, 60 photos).
-- ---------------------------------------------------------------------------
create index if not exists notes_farm_created_at_idx
  on public.notes (farm_id, created_at desc);

create index if not exists photos_farm_created_at_idx
  on public.photos (farm_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Every photo object must live under its own farm's folder:
-- <farm_id>/<uuid>.jpg. This blocks a row from pointing at another farm.
-- left() is used instead of LIKE so the UUID cannot act as a wildcard.
-- ---------------------------------------------------------------------------
alter table public.photos
  add constraint photos_storage_path_prefix_check
  check (left(storage_path, length(farm_id::text) + 1) = farm_id::text || '/');
