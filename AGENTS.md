# Farm updates system

A web app that tracks recurring work across farm plots in Nigeria and sends WhatsApp reminders (email as fallback). Built for a farm owner based in the UK. Two users with equal permissions.

This is NOT an AI agent or chatbot. It is a scheduled reminder system: date calculations plus scheduled messages, done in plain code.

## Read first
- `docs/PRODUCT.md`: lifecycle, alert rules, data model, scope, open questions
- `docs/DESIGN.md` and `design/`: tokens, layout rules, screen exports
- `docs/STATUS.md`: what is done and what is next. Update it at the end of every task.

## Stack
Next.js (App Router) + TypeScript + Tailwind CSS. Supabase (Postgres, Auth, Storage, scheduled functions). Meta WhatsApp Cloud API. Resend for email. Vercel for hosting. GitHub. Vitest for tests.

## Rules
1. Scope: build only what `docs/PRODUCT.md` lists as v1. Cost tracking, workers and payments are phase 2: do not build them unless asked, but do not make schema choices that block them.
2. Dates: due dates are calendar dates with no time. Alerts go out at a fixed hour in Europe/London. Never use the device or server time zone for due-date logic.
3. The schedule engine is one pure module (`src/lib/schedule`) with no database or network calls inside it. It must have Vitest tests, including: leap years, month-end offsets (e.g. 3 months after 30 November), season windows that wrap the year (dry season spans December to January), and UK daylight saving changes. Any change to the engine requires the tests to pass.
4. Alerts must be idempotent. One notification log row per (farm stage, alert type, recipient, channel), enforced by a unique constraint. Never send the same alert twice.
5. Security: public sign-up is disabled (invite only). Row-level security on every table. Secrets live only in environment variables or Supabase secrets, never in the repo. Never log tokens or phone numbers. `.env*` stays gitignored.
6. Design: use the tokens in `docs/DESIGN.md` as CSS variables for both modes. Never hard-code colours. Status is never shown by colour alone: always an icon plus a text label. One primary button per screen.
7. Copy: sentence case, verb-first buttons, no "please", no "successfully", no exclamation marks.
8. Work in small tasks. Run lint, typecheck and tests before finishing. Make a clear commit after each task. Do not refactor unrelated code.
9. If a requirement is unclear or conflicts with these docs, ask instead of guessing. This matters most for any rule marked TBC in `docs/PRODUCT.md`.
10. At the end of each task, update `docs/STATUS.md`: what changed, what is next, open questions.
