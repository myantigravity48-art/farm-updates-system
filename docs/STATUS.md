# Status

Last updated: 2026-10-13

## Done
- Product defined: lifecycle, alert rules, v1 scope (see `PRODUCT.md`)
- Design direction approved: dark-first deep forest with moss green, equal light mode (see `DESIGN.md`)
- Designs made for all v1 screens: Dashboard, Farm detail, Add farm, Mark done, Alert settings, Stage template, Login
- Project scaffold: Next.js, TypeScript, Tailwind, light and dark theme tokens, responsive app shell (icon rail, farm panel, bottom tabs), placeholder routes, StatusPill and StatusDot, temporary mock farms, `/dev/tokens` (commit f9de7dd)
- Schedule engine in `src/lib/schedule` with Vitest tests (15 tests, all passing), `test:tz` script, pure module with no database calls. See `docs/ENGINE.md` for details.
- Folder renamed from `designs/` to `design/`

## Decisions
- Alerts are email only (Resend). WhatsApp and SMS are dropped.
- The owner is correcting the initial clearing and planting timings and will send near-final dates. Treat those timings as editable data only.

## Next (in order)
1. Supabase project: schema from `PRODUCT.md`, row-level security on every table, public sign-up off, two invited users
2. Seed data: the 8 stage templates and season windows (placeholder timings), the four farms
3. Screens in order: Login (auth), Dashboard, Farms and Add farm, Farm detail, Mark done, Alert settings, Stage template
4. Daily email alert job with Resend (needs the project domain verified)
5. Deploy

## Waiting on
- The owner's corrected clearing and planting timings, and answers to the other open questions in `PRODUCT.md`
- Project domain, so Resend can send verified email
- Phase 2 designs (Costs, Workers) not made yet

## Notes for the next agent
- Timing values for stages 1, 2 and 4 to 7 are placeholders until the owner confirms them. Keep them as editable data.
- The screen exports folder is `design/`. If references to `designs/` remain anywhere, fix them.
- Read `docs/ENGINE.md` for the schedule engine rules, public API, and alert key format.
