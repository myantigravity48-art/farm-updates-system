# Status

Last updated: 2026-10-12

## Done
- Product defined: lifecycle, alert rules, v1 scope (see `PRODUCT.md`)
- Design direction approved: dark-first deep forest with moss green, equal light mode (see `DESIGN.md`)
- Designs for v1 screens sent to the owner: Dashboard, Farm detail, Add farm, Mark done, Alert settings, Stage template
- Repo and project brief files created
- Next.js App Router scaffold with TypeScript, Tailwind CSS, ESLint, src directory, and @/* alias
- Dark and light theme tokens, fonts, theme toggle, responsive navigation shell, farm panel, route placeholders, shared status primitives, and temporary farm mocks
- Development token reference at /dev/tokens

## Next (in order)
1. Supabase project: schema from `PRODUCT.md`, row-level security on every table, public sign-up off, two invited users
2. Schedule engine in `src/lib/schedule` with Vitest tests, no database inside it
3. Seed data: the 8 stage templates and season windows (placeholder timings), the four farms
4. Screens in order: Login, Dashboard, Farms and Add farm, Farm detail, Mark done, Alert settings, Stage template
5. Daily alert job with email first (Resend), then WhatsApp once templates are approved
6. Deploy

## Waiting on
- The owner's answers to the open questions in `PRODUCT.md`
- Domain and business email, then the Meta business portfolio and WhatsApp templates
- Claude Code subscription (currently building on free Codex credits)
- Designs still to make: Login, and the phase 2 screens (Costs, Workers)

## Open decisions
- Dedicated WhatsApp sender number versus the owner's existing Business app number via coexistence

## Notes for the next agent
- Timing values for stages 4 to 7 are placeholders until the owner confirms them. Keep them as editable data.
