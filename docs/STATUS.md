# Status

Last updated: 2026-10-20

## Done
- Product defined: lifecycle, alert rules, v1 scope (see `PRODUCT.md`)
- Design direction approved: dark-first deep forest with moss green, equal light mode (see `DESIGN.md`)
- Designs made for all v1 screens: Dashboard, Farm detail, Add farm, Mark done, Alert settings, Stage template, Login
- Project scaffold: Next.js, TypeScript, Tailwind, light and dark theme tokens, responsive app shell (icon rail, farm panel, bottom tabs), placeholder routes, StatusPill and StatusDot, temporary mock farms, `/dev/tokens` (commit f9de7dd)
- Schedule engine in `src/lib/schedule` with Vitest tests (15 tests, all passing), `test:tz` script, pure module with no database calls. See `docs/ENGINE.md` for details.
- Folder renamed from `designs/` to `design/`
- Database schema written and security-reviewed, then applied in Supabase (`0001_schema.sql`, `0002_seed.sql`, `checks.sql`). See `docs/SCHEMA.md` for tables, RLS, grants, storage bucket, and how to apply.
- Auth and login: route groups `(auth)` and `(app)`, login and forgot-password screens, proxy session refresh and redirects, server-side `getUser()` validation, sign out, Account section with change password, `next` sanitiser and password validator tests. See `docs/AUTH.md`.

## Decisions
- Alerts are email only (Resend). WhatsApp and SMS are dropped.
- The owner is correcting the initial clearing and planting timings and will send near-final dates. Treat those timings as editable data only.
- No public sign-up. The two users are invited from the Supabase dashboard; the app only calls `signInWithPassword`.

## Next (in order)
1. Screens in order: Dashboard, Farms and Add farm, Farm detail, Mark done, Alert settings, Stage template
2. Daily email alert job with Resend (needs the project domain verified)
3. Deploy

## Waiting on
- The owner's corrected clearing and planting timings, and answers to the other open questions in `PRODUCT.md`
- Project domain, so Resend can send verified email
- Resend configured as custom SMTP, so real password reset can replace the forgot-password stub
- Phase 2 designs (Costs, Workers) not made yet

## Open items
- `/forgot-password` is a stub with no email. Replace it after Resend SMTP is set up (TODO in the page and `docs/AUTH.md`).
- The login desktop panel uses `public/login-moss.jpg` when present. The real photograph still needs to be added.

## Notes for the next agent
- Timing values for stages 1, 2 and 4 to 7 are placeholders until the owner confirms them. Keep them as editable data.
- The screen exports folder is `design/`. If references to `designs/` remain anywhere, fix them.
- Read `docs/ENGINE.md` for the schedule engine rules, public API, and alert key format.
- Read `docs/SCHEMA.md` for the database schema and security policies.
- Read `docs/AUTH.md` for the login flow, route groups, session validation, and the no-sign-up rules.
- The database types in `src/lib/supabase/database.types.ts` are hand-written. Regenerate with `npx supabase gen types typescript` once the CLI is connected.
