# Database schema

## How to apply

1. Open the Supabase dashboard → SQL Editor.
2. Paste and run `supabase/migrations/0001_schema.sql`. This creates all tables, indexes, the auto-create trigger, the storage bucket, RLS policies, and grants.
3. Paste and run `supabase/migrations/0002_seed.sql`. This inserts the 8 stage templates, 2 season windows, and 1 alert_settings row.
4. Paste and run `supabase/migrations/0004_farm_functions.sql`. This creates the transactional farm-creation functions and their execute grants.
5. Paste and run `supabase/migrations/0005_notes_photos_author.sql`. This adds `author_name` to notes and photos, the newest-first indexes, and the photo storage path check.
6. In the SQL Editor, paste and run `supabase/checks/0005_checks.sql` to verify only the 0005 changes.
7. Run `supabase/checks.sql` when you need to recheck the original schema security rules. It is not a substitute for the migration-specific check file.

## Tables

| Table | Purpose |
|-------|---------|
| `season_windows` | Recurring date ranges for season-triggered stages. PK is the key (`dry_season`, `planting`). |
| `stage_templates` | The 8-stage lifecycle definition. Position is unique. Check constraint ensures season_window rows have a window_key and no offset, and after_planting rows have an offset and no window_key. |
| `farms` | One row per farm plot. Unique index on `lower(name)`. `schedule_anchor_date` defaults to today but the app sets it explicitly. `created_by` references `auth.users`. |
| `farm_stages` | One row per farm per stage template (auto-created by trigger). Tracks done state, done date, override. Unique on `(farm_id, template_id)`. |
| `notes` | Free-text notes on a farm or a specific stage. `author_name` stores the writer's display name at the time of writing. |
| `photos` | Photo metadata. The file lives in the `farm-photos` storage bucket; `storage_path` points to it. `author_name` stores the uploader's display name. |
| `recipients` | Email recipients for alerts. Unique index on `lower(email)`. |
| `alert_settings` | Single-row config table (PK is `boolean default true check (id)`). Controls heads-up days, reminder days, overdue repeat, and London send hour. |
| `notification_log` | One row per sent or failed alert. Unique on `(farm_stage_id, recipient_id, alert_type, occurrence_key)` to enforce idempotency. |

All `auth.users` references (`created_by` and `done_by`) are nullable and use `ON DELETE SET NULL`, preserving farm records, notes, and photos when a user is deleted.

## Auto-create trigger

When a row is inserted into `farms`, a trigger function inserts one `farm_stages` row (is_done = false) for every row in `stage_templates`. The function uses `security invoker` and `set search_path = ''` with all objects schema-qualified.

## Farm functions

`0004_farm_functions.sql` adds two transactional functions. Both use `security invoker` and `set search_path = ''`, and every object name is schema-qualified, so row-level security and `auth.uid()` apply to the signed-in user.

| Function | Arguments | Returns | Purpose |
|----------|-----------|---------|---------|
| `create_farm` | `p_name text, p_location text, p_size_value numeric, p_size_unit text, p_notes text, p_current_position int, p_planting_date date, p_anchor_date date` | `uuid` | Inserts one farm, lets the trigger create its stages, then marks every stage before `p_current_position` as done. The planting stage is found by `stage_templates.window_key = 'planting'`, never by a position literal. When planting is already past, its `done_date` is set to `p_planting_date`. |
| `create_farms_bulk` | `p_rows jsonb, p_anchor_date date` | `int` | Creates each row at position 1 by calling `create_farm`. All rows succeed or none do. Rejects more than 100 rows. A duplicate name returns `row N: a farm with that name already exists`. |

`create_farm` rejects a blank name, a position outside 1 to the highest `stage_templates.position`, a missing planting date when the chosen stage is after planting, and a planting date when the chosen stage is not after planting.

`execute` is revoked from `public` and `anon`, and granted to `authenticated` only. The existing checks confirm both functions exist and that `anon` and `public` cannot execute them.

## Storage

- Bucket: `farm-photos`, private (public = false), 10 MB file size limit, allowed MIME types: jpeg, png, webp, gif.
- Storage policies: authenticated users can select, insert, update, and delete objects in the bucket. Each policy also rejects anonymous JWTs, so anonymous sign-ins cannot access it.
- Object paths are `<farm_id>/<uuid>.jpg`. The server action generates the UUID and returns the path; the browser uploads the re-encoded JPEG with the user's session.
- The Farm detail page never renders a public URL. Signed URLs are created server-side in one batch call with a 1 hour expiry, and a photo whose signature fails shows a placeholder tile.
- A database check (`photos_storage_path_prefix_check`) rejects any row whose `storage_path` does not start with its own `farm_id` and a slash.

## Farm detail additions (0005)

`0005_notes_photos_author.sql` adds:

| Change | Detail |
|--------|--------|
| `notes.author_name` | Nullable text. The display name captured when the note was added, so the record survives a user being deleted. |
| `photos.author_name` | Nullable text. The display name captured when the photo was added. |
| `notes_farm_created_at_idx` | `(farm_id, created_at desc)` for the newest-first note list. |
| `photos_farm_created_at_idx` | `(farm_id, created_at desc)` for the newest-first photo grid. |
| `photos_storage_path_prefix_check` | `left(storage_path, length(farm_id::text) + 1) = farm_id::text || '/'`. |

`supabase/checks/0005_checks.sql` contains four numbered checks for the columns, indexes, constraint and existing photo rows. Each query has an exact `EXPECT:` result above it.

## RLS policies

Every table has row-level security enabled. No table is accessible to the `anon` role. Every authenticated policy (including storage) also rejects a JWT whose `is_anonymous` claim is true, so anonymous sign-ins cannot read or write data.

| Table | authenticated | service_role |
|-------|--------------|--------------|
| `farms` | select, insert, update, delete | all |
| `farm_stages` | select, insert, update, delete | all |
| `notes` | select, insert, update, delete | all |
| `photos` | select, insert, update, delete | all |
| `recipients` | select, insert, update, delete | all |
| `stage_templates` | select, update | all |
| `season_windows` | select, update | all |
| `alert_settings` | select, update | all |
| `notification_log` | select | all |

The two invited users have equal permissions. The alert job will write to `notification_log` using the service-role key server-side.

## Grants

- `anon` and `public`: all privileges revoked on the public schema's tables, sequences, functions, and schema itself.
- `authenticated`: granted only the operations matching the RLS policies above.
- `service_role`: full access to all tables, sequences, and functions.
- Schema usage granted to `authenticated` and `service_role`.

## App wiring

- `src/lib/supabase/client.ts` — browser client using `createBrowserClient` from `@supabase/ssr`.
- `src/lib/supabase/server.ts` — server client using `createServerClient` with Next.js `cookies()`.
- `src/lib/supabase/database.types.ts` — hand-written types mirroring the schema, including the 0005 columns. Regenerate later with `npx supabase gen types typescript`.
- `.env.example` — placeholder variable names. Copy to `.env.local` and fill in real values.

## Environment variables

| Variable | Where to find it |
|----------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase dashboard → Settings → API → Publishable key |

## Dashboard settings

After applying the migrations, disable public sign-up and anonymous sign-ins in the Supabase dashboard. Invite the two users instead; they have the same authenticated permissions. Keep the service-role key only in server-side deployment secrets, never in the app or repository.
