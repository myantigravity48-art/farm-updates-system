# Status

Last updated: 2026-11-07

## Done
- Rendering fix 1: removed unused Cache Components and dependent partial-prefetching config so authenticated, time-dependent pages render per request. Removed non-function exports from `"use server"` modules, and the display-name action now reports `Name saved.`.
- Rendering fix 2: Dashboard now combines the London-hour greeting with the authenticated user's optional display name and renders the heading in both the populated and no-farms/error states. Greeting tests cover the named and unnamed forms.
- Rendering fix 3: the shared shell offsets desktop content beyond the icon rail and farm panel, with 24px desktop and 16px mobile gutters. Settings is centred at 640px max width and its account, display-name and password inputs fill the column.
- Product defined: lifecycle, alert rules, v1 scope (see `PRODUCT.md`)
- Design direction approved: dark-first deep forest with moss green, equal light mode (see `DESIGN.md`)
- Designs made for all v1 screens: Dashboard, Farm detail, Add farm, Mark done, Alert settings, Stage template, Login
- Project scaffold: Next.js, TypeScript, Tailwind, light and dark theme tokens, responsive app shell (icon rail, farm panel, bottom tabs), placeholder routes, StatusPill and StatusDot, `/dev/tokens` (commit f9de7dd)
- Schedule engine in `src/lib/schedule` with Vitest tests (15 tests, all passing), `test:tz` script, pure module with no database calls. See `docs/ENGINE.md` for details.
- Folder renamed from `designs/` to `design/`
- Database schema written and security-reviewed, then applied in Supabase (`0001_schema.sql`, `0002_seed.sql`, `checks.sql`). See `docs/SCHEMA.md` for tables, RLS, grants, storage bucket, and how to apply.
- Auth and login: route groups `(auth)` and `(app)`, login and forgot-password screens, proxy session refresh and redirects, server-side `getUser()` validation, sign out, Account section with change password, `next` sanitiser and password validator tests. See `docs/AUTH.md`.
- Step 5a built: data layer (`src/lib/data`) with a pure row mapper and summary builder, real farm panel, `/farms` grid, Add farm dialog/sheet, bulk add, Edit farm, Toast, UK date formatting, pure validation and bulk parsing, and the 0004 farm functions with checks. Mock farms removed. All 89 tests pass, including the original 30.
- Step 5b built: the Dashboard at "/" (`src/app/(app)/page.tsx`, `src/components/dashboard/`, `src/lib/data/dashboard.ts`, `build-dashboard.ts`, `timeline.ts`, and phrase/greeting pure functions in `src/lib/format/`). Real data through the existing session-scoped Supabase server client. `buildDashboard(input, today)` is pure and tested, plus `buildSeasonTimeline`, window/date stage phrases, and the London-hour greeting. Screen matches the Dashboard exports: KPI cards (Overdue, Next 14 days, Done this month, Farms), Needs attention, Farm progress, Season timeline, Coming up, both themes, 8-row caps with "+ N more" and "View all N farms". Add farm and Edit farm already revalidate "/" and "/farms" via `refreshFarmLists`.
- Step 5c built: the Farm detail page at `/farms/[id]` (header, stage timeline, Notes and Photos). `getFarmDetail` loads the farm, templates, windows, alert settings, stages, 50 newest notes and 60 newest photos in parallel, then runs the schedule engine. `buildStageRows` is pure and tested (rule text from templates, done with and without dates, date and window text, overrides, unscheduled, overdue, open window, next up, all done). Photos use server-signed URLs in one batch with a 1 hour expiry. Notes and photos are added and deleted through server actions that call `auth.getUser()`, validate with pure functions, and revalidate the farm page. The upload flow shrinks each image in the browser to 1600px JPEG at 0.8, asks the server for a UUID path, uploads with the user's session, then registers the row with `author_name`; failures delete the object. Settings has a Display name field. The `unscheduled` StatusPill variant is added. Step 5c is awaiting application of `0005_notes_photos_author.sql` and a pass of `supabase/checks/0005_checks.sql`.
- Step 5d implementation is ready: Mark done, undo, manual stage dates, planting-date changes, Dashboard actions, completion author names, notes and photo linking, plus migration-specific checks. Step 5d is done once `0006_mark_done.sql` is applied and its checks pass.
- `0004_farm_functions.sql` is written but NOT applied yet. Adding one farm or several farms needs it applied first. Step 5a is done once it has been applied.
- `0005_notes_photos_author.sql` is written but NOT applied yet. Step 5c is done once it has been applied and `supabase/checks/0005_checks.sql` has been run.

## Decisions
- Alerts are email only (Resend). WhatsApp and SMS are dropped.
- The owner is correcting the initial clearing and planting timings and will send near-final dates. Treat those timings as editable data only.
- No public sign-up. The two users are invited from the Supabase dashboard; the app only calls `signInWithPassword`.

## Next (in order)
1. Alert settings
2. Stage template editor
3. Daily email alert job with Resend (needs the project domain verified)
4. Deploy

## Waiting on
- Apply `supabase/migrations/0005_notes_photos_author.sql` and run `supabase/checks/0005_checks.sql`, then test adding and deleting notes and photos.
- Apply `supabase/migrations/0004_farm_functions.sql` and run `supabase/checks.sql`, then test Add farm and bulk add.
- Apply `supabase/migrations/0006_mark_done.sql` and run `supabase/checks/0006_checks.sql`, then test Mark done and stage actions. This completes step 5d.
- The owner's corrected clearing and planting timings, and answers to the other open questions in `PRODUCT.md`
- Project domain, so Resend can send verified email
- Resend configured as custom SMTP, so real password reset can replace the forgot-password stub
- Phase 2 designs (Costs, Workers) not made yet

## Open items
- `/forgot-password` is a stub with no email. Replace it after Resend SMTP is set up (TODO in the page and `docs/AUTH.md`).
- The login desktop panel uses `public/login-moss.jpg` when present. The real photograph still needs to be added.
- The Farms page has no dedicated design export. It reuses the shared cards and tokens for now and is on the polish list in `docs/POLISH.md`.
- The Farm detail page shows the 50 newest notes and 60 newest photos with no paging yet. Revisit when farms collect more.

## Notes for the next agent
- Timing values for stages 1, 2 and 4 to 7 are placeholders until the owner confirms them. Keep them as editable data.
- The screen exports folder is `design/`. If references to `designs/` remain anywhere, fix them.
- Read `docs/ENGINE.md` for the schedule engine rules, public API, and alert key format.
- Read `docs/SCHEMA.md` for the database schema, security policies and the 0004 and 0005 migrations.
- Read `docs/AUTH.md` for the login flow, route groups, session validation, display name, and the no-sign-up rules.
- Read `docs/STATUS.md` and `docs/POLISH.md` before starting a screen.
- Farm detail stage progress is read-only. The next step adds Mark done plus planting-date and manual stage-date editing. Do not add stage writes to `src/lib/data/farm-detail.ts` or `buildStageRows` yet.
- Photos live in the private `farm-photos` bucket. Sign paths on the server with `createSignedUrls`; never store or render a public URL.
- The database types in `src/lib/supabase/database.types.ts` are hand-written. Regenerate with `npx supabase gen types typescript` once the CLI is connected.
