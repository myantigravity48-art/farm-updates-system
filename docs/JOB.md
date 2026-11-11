# Daily alert job

The job loads farms, farm stages, templates, season windows, alert settings, enabled recipients and previously sent log rows. Each table query pages in blocks of 1,000 until the final short page. The planner computes eligible occurrences using today's Europe/London calendar date. Unless `force=1` is supplied, the job sends only during the configured Europe/London hour.

For each recipient, the job atomically claims eligible occurrence keys before rendering and sending one digest email (or a single-alert email). A 600 ms pause separates recipient sends. It records the provider message ID on success and a short error code on failure. Failed rows can be retried immediately. A pending claim is reclaimable after 30 minutes if a process stopped before finishing it. The database unique key and claim function prevent concurrent jobs from sending the same occurrence.

If Resend returns HTTP 429, the current recipient's claims are marked failed and the remaining recipients are not sent during that run. Other failures are recorded and the job continues. An exception after claiming marks those rows failed before it is rethrown. Results and logs contain counts and codes, never recipient addresses or names.

## Environment variable names

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `ALERT_FROM_ADDRESS`
- `ALERT_REPLY_TO` (optional)
- `APP_URL`
- `CRON_SECRET`
- `ALERTS_BASE_URL` (optional; defaults to localhost)

## Trigger locally

Set variables in the ignored `.env.local` file. The npm scripts load it with Node's `--env-file` flag, so the secret is not entered in the command or printed.

- `npm run alerts:dry` runs with `dryRun=1&force=1`; it reports counts and sends nothing.
- `npm run alerts:send` runs with `force=1` and sends eligible email.

Both scripts call `POST /api/cron/daily-alerts`. They refuse a non-localhost base URL unless `--allow-remote` is passed directly to the script.

## Schedule

The gate uses `Europe/London`, including daylight saving. A scheduler needs two UTC entries, 07:00 and 08:00, because London's 08:00 is 08:00 UTC in winter and 07:00 UTC in summer. The send-hour gate lets only the matching entry through; the other call exits without sending.

## Resend limits

Resend's free plan currently allows 100 emails per day. Until a sending domain is verified, Resend restricts recipients to the account owner's own address. Verify a domain and configure its DNS before sending to the alert list.
