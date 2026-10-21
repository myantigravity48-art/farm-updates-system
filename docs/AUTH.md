# Authentication

Login and session handling for the two invited users. There is no sign-up.

## Flow

1. A logged-out visitor opens any app route. `src/proxy.ts` refreshes the Supabase session cookies and redirects to `/login?next=<path>`.
2. `/login` is a server page. The `next` value is sanitised by `safeNextPath` before it reaches the form.
3. The form posts to the `signIn` server action (`src/lib/auth/actions.ts`), which calls `supabase.auth.signInWithPassword` only. Failures return one generic message so the app never reveals whether an email exists.
4. On success the server client writes the session cookies through `@supabase/ssr`, then the action redirects to the sanitised `next` path (default `/`).
5. A logged-in visitor who opens `/login` is redirected to `/` by the proxy.

Password change is a separate server action. It revalidates the user, checks the new password with the pure `validateNewPassword` function, then calls `supabase.auth.updateUser({ password })`. Passwords are never logged.

## Route groups

The app router is split so the login screens get no app shell.

| Group | Routes | Layout |
|-------|--------|--------|
| `(auth)` | `/login`, `/forgot-password` | Centred auth layout with a theme toggle. No rail, no farm panel, no bottom tabs. |
| `(app)` | `/`, `/farms`, `/farms/[id]`, `/schedule`, `/alerts`, `/settings`, `/dev/tokens` | `AppShell` with the icon rail, farm panel and bottom tabs. Requires a session. |

`src/app/layout.tsx` only holds the HTML, fonts and theme provider.

## How the session is validated

- **Proxy (`src/proxy.ts`)** runs on every non-asset request. It creates a `@supabase/ssr` server client, calls `getClaims()` so an expired access token is refreshed and the new cookies are written, then applies the redirect rules. It is an optimistic check, not the only check.
- **Server layout (`src/app/(app)/layout.tsx`)** calls `readSession()` for every app request. `readSession` uses `supabase.auth.getUser()`, which validates the user with the auth server. `getSession()` alone is never trusted.
- **Server actions** revalidate the user with `getUser()` before changing a password. Sign out clears the session with `auth.signOut()` and redirects to `/login`.
- **Proxy matcher** skips `_next/static`, `_next/image`, `favicon.ico` and any path with a file extension, so public assets such as `public/login-moss.jpg` are not redirected.

## "No sign-up" and where it is enforced

- The Supabase dashboard setting **Allow new users to sign up** is off, and anonymous sign-ins are off. Onboarding is invite-only from the dashboard.
- The app has no `/signup` route and never calls `supabase.auth.signUp`. The only auth entry point is `signInWithPassword`.

## The `next` parameter

`safeNextPath` in `src/lib/auth/next-path.ts` accepts only a relative path that starts with a single `/` and contains no scheme or backslash. Everything else falls back to `/`. It is applied on the login page and again inside the server action, so a hand-crafted form cannot redirect off-site.

## Missing configuration

`src/lib/supabase/config.ts` reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` lazily. If one is missing:

- the proxy returns a plain-text response naming the variable;
- the app layout renders a readable "app is not configured" panel naming the variable;
- the login action returns the same message in its error region.

The service-role key is not used anywhere in the app.

## Login photo

The desktop panel looks for `public/login-moss.jpg`. When the file exists it is shown under a dark overlay; when it is absent the panel uses the `--raised` token. The photograph is never cropped out of a mockup. The overlay and text colours are the `--photo-overlay` and `--on-photo` tokens.

## Known gap

`/forgot-password` is a static stub. It sends no email and tells the user to ask the system manager. Real password reset needs Resend connected as the Supabase custom SMTP provider, then `resetPasswordForEmail` and a reset page. There is a TODO in the page.
