# Status

Last updated: 2026-10-21

## Done
- Product defined: lifecycle, alert rules, v1 scope (see `PRODUCT.md`)
- Design direction approved: dark-first deep forest with moss green, equal light mode (see `DESIGN.md`)
- Designs made for all v1 screens: Dashboard, Farm detail, Add farm, Mark done, Alert settings, Stage template, Login
- Project scaffold: Next.js, TypeScript, Tailwind, light and dark theme tokens, responsive app shell (icon rail, farm panel, bottom tabs), placeholder routes, StatusPill and StatusDot, `/dev/tokens` (commit f9de7dd)
- Schedule engine in `src/lib/schedule` with Vitest tests (15 tests, all passing), `test:tz` script, pure module with no database calls. See `docs/ENGINE.md` for details.
- Folder renamed from `designs/` to `design/`
- Database schema written and security-reviewed, then applied in Supabase (`0001_schema.sql`, `0002_seed.sql`, `checks.sql`). See `docs/SCHEMA.md` for tables, RLS, grants, storage bucket, and how to apply.
- Auth and login: route groups `(auth)` and `(app)`, login and forgot-password screens, proxy session refresh and redirects, server-side `getUser()` validation, sign out, Account section with change password, `next` sanitiser and password validator tests. See `docs/AUTH.md`.
- Step 5a built: data layer (`src/lib/data`) with a pure row mapper and summary builder, real farm panel, `/farms` grid, Add farm dialog/sheet, bulk add, Edit farm, Toast, UK date formatting, pure validation and bulk parsing, and the 0004 farm functions with checks. Mock farms removed. All 89 tests pass, including the original 30.
- `0004_farm_functions.sql` is written but NOT applied yet. Adding one farm or several farms needs it applied first. Step 5a is done once it has been applied.

## Decisions
- Alerts are email only (Resend). WhatsApp and SMS are dropped.
- The owner is correcting the initial clearing and planting timings and will send near-final dates. Treat those timings as editable data only.
- No public sign-up. The two users are invited from the Supabase dashboard; the app only calls `signInWithPassword`.

## Next (in order)
1. Dashboard (step 5b)
2. Farm detail, Mark done, Alert settings, Stage template
3. Daily email alert job with Resend (needs the project domain verified)
4. Deploy

## Waiting on
- Apply `supabase/migrations/0004_farm_functions.sql` and run `supabase/checks.sql`, then test Add farm and bulk add.
- The owner's corrected clearing and planting timings, and answers to the other open questions in `PRODUCT.md`
- Project domain, so Resend can send verified email
- Resend configured as custom SMTP, so real password reset can replace the forgot-password stub
- Phase 2 designs (Costs, Workers) not made yet

## Open items
- `/forgot-password` is a stub with no email. Replace it after Resend SMTP is set up (TODO in the page and `docs/AUTH.md`).
- The login desktop panel uses `public/login-moss.jpg` when present. The real photograph still needs to be added.
- The Farms page has no dedicated design export. It reuses the shared cards and tokens for now and is on the polish list in `docs/POLISH.md`.

## Notes for the next agent
- Timing values for stages 1, 2 and 4 to 7 are placeholders until the owner confirms them. Keep them as editable data.
- The screen exports folder is `design/`. If references to `designs/` remain anywhere, fix them.
- Read `docs/ENGINE.md` for the schedule engine rules, public API, and alert key format.
- Read `docs/SCHEMA.md` for the database schema, security policies and the 0004 farm functions.
- Read `docs/AUTH.md` for the login flow, route groups, session validation, and the no-sign-up rules.
- Read `docs/STATUS.md` and `docs/POLISH.md` before starting the Dashboard.
- The database types in `src/lib/supabase/database.types.ts` are hand-written. Regenerate with `npx supabase gen types typescript` once the CLI is connected.
