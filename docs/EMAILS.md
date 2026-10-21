# Alert emails

Spec for every email the system sends. Read this before building the email job (build step 6). It supersedes the short email wording in `PRODUCT.md`.

## Principles
- The subject line carries the point. Someone who reads only the subject knows what to do.
- Plain, short, no exclamation marks, no "please", sentence case.
- UK English and UK dates: "Fri 23 Oct 2026". Day counts: "1 day", "5 days", "today", "tomorrow".
- Never include passwords, private notes or photos. Include only farm name, stage name, dates and the person who marked a job done.
- No tracking pixels, no tracked or shortened links, no images. Links go straight to the app.
- Always send a plain-text version alongside the HTML.

## Sender
- From: `Farm updates system <alerts@YOURDOMAIN>` (use the verified Resend domain)
- Reply-to: the manager's email (placeholder: set in config, not hard-coded)
- Send time: the daily job's hour in Europe/London (default 08:00)

## Variables
`{{farm}}`, `{{stage}}`, `{{date}}` (due date or window opening), `{{window_end}}` (window stages), `{{days}}`, `{{name}}` (who marked it done), `{{next_stage}}`, `{{next_date}}`, `{{link}}` (the farm's page in the app).

Day phrases:
- Future: 0 = "today", 1 = "tomorrow", n = "in n days"
- Past: 1 = "1 day late", n = "n days late"

## One email per person per day (daily digest)
If a recipient has two or more alerts to receive on the same run, send ONE email that lists them all, not one email per alert. If they have exactly one, send the single-alert form below. Each alert still gets its own row in `notification_log`, so idempotency is unchanged.

`done_notice` is event-driven. It is sent straight away, on its own, to the other recipients, and is never part of the digest.

### Digest subject
`Farm updates: {{n_overdue}} overdue, {{n_due_soon}} due soon`. Leave out any part that is zero. Order: overdue first. Examples: `Farm updates: 1 overdue, 2 due soon`, `Farm updates: 3 due soon`.

### Digest body (text)
```
Good morning.

OVERDUE
- Obi-Umuagbogho: Land clearing. Window closed Tue 31 Mar 2026 (3 days late).

DUE SOON
- Iyanuole: Second round-weeding. Due Fri 23 Oct 2026 (in 9 days).
- Obaoba: First fertilizer. Due Mon 26 Oct 2026 (in 12 days).

Open the app: {{app_url}}

You get these emails because you are on the alert list for Farm updates system. To change who gets them, open Alerts in the app.
```
Sort rules: overdue by most days late first; due soon by date, earliest first. Each line links to that farm's page in the HTML version.

## Single-alert emails
Used when a recipient has exactly one alert on a run.

### Stage due on a date
| Type | Subject | Body line |
|------|---------|-----------|
| heads_up | `{{farm}}: {{stage}} due in {{days}} days` | `{{stage}} on {{farm}} is due on {{date}}.` |
| reminder | `{{farm}}: {{stage}} due {{day phrase}}` | `{{stage}} on {{farm}} is due on {{date}}.` |
| overdue | `Overdue: {{farm}}, {{stage}} ({{days}} days late)` | `{{stage}} on {{farm}} was due on {{date}} and is not marked done.` |

### Stage with a season window
| Type | Subject | Body line |
|------|---------|-----------|
| heads_up | `{{farm}}: {{stage}} window opens in {{days}} days` | `The {{stage}} window on {{farm}} opens on {{date}} and closes on {{window_end}}.` |
| reminder | `{{farm}}: {{stage}} window opens {{day phrase}}` | `The {{stage}} window on {{farm}} opens on {{date}} and closes on {{window_end}}.` |
| overdue | `Overdue: {{farm}}, {{stage}} window closed` | `The {{stage}} window on {{farm}} closed on {{window_end}} and the stage is not marked done.` |

Every single-alert email ends with: `Open {{farm}}: {{link}}` and the footer line.

## done_notice
Subject: `{{farm}}: {{stage}} marked done`
Body: `{{name}} marked {{stage}} done on {{farm}} on {{date}}. Next: {{next_stage}}, due {{next_date}}.`
For the last stage: `{{name}} marked {{stage}} done on {{farm}} on {{date}}. That completes every stage for this farm.`
If the next stage has no date yet (planting date not set): `Next: {{next_stage}}, date not set yet.`

## HTML layout
- One column, max width 560px, centred, on a warm background (#F4F3EC) with a white card (#FFFFFF) and 1px border (#E2E1D6). Light mode only. Email clients handle dark mode unpredictably.
- A slim top bar in the primary green (#2B6B3A) with the text "Farm updates system" in white, 16px.
- Text colour #14201A, secondary text #5E6B62. System font stack (email clients cannot rely on custom fonts). Body 16px, line height 1.5.
- Section labels ("Overdue", "Due soon") in the status colour, text always present: overdue #B3402A, due soon #B97C0C. The status is carried by the word as well as the colour.
- Each digest item is a row: farm name in bold, stage and dates below it in secondary text. The farm name links to the farm page.
- One button: "Open the app". Background #2B6B3A, white text, at least 44px high, full width on small screens.
- Footer in secondary text, 13px.
- Inline all CSS. No external stylesheets, no web fonts, no images.

## Build notes (for step 6)
- One pure function, `renderAlertEmail(alerts, context)`, returns `{ subject, text, html }`. It has no network and no database calls and takes the date in as an argument.
- Vitest tests for: digest subject variants (overdue only, due soon only, both, singular and plural), day phrases (today, tomorrow, in n days, 1 day late), date formatting (UK weekday format), sorting, single-alert forms for date and window stages, done_notice with and without a next date, and HTML escaping of farm names (a name containing & or < must not break the email).
- A dev-only preview page at `/dev/emails` that renders each sample in both the HTML and text forms. Remove it before launch.
- Send test emails only to the manager's own address until the domain is verified and the digest looks right on a real phone.
