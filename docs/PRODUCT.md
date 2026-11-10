# Product

## Purpose
The owner has many farm plots in Nigeria and lives in the UK. Each plot goes through a fixed lifecycle of jobs. The app tells him what is coming up, what is overdue, and lets either user mark a job done. Alerts go out by email.

Users: two, equal permissions (the owner and the person who manages the system). Both can log in, mark jobs done, and receive alerts. More recipients may be added later.

Farms so far: Obi-Umuagbogho, Uzor Timber, Iyanuole, Obaoba. Many more are coming, so every list must scale to 50+ farms (search, bulk add). Size and dimensions per farm come later and are optional.

## Lifecycle (one set of 9 stages per farm)
Early stages follow season windows. Later stages are counted from the planting date.

| # | Stage | Trigger | Rule | Rule status |
|---|-------|---------|------|-------------|
| 1 | Land clearing (cut trees, gather weeds, isolate wood, burn weeds, clear log remnants) | season window | Dry season | PENDING CORRECTION. The owner is correcting the clearing timing and will supply near-final dates. Seed placeholder: November to March |
| 2 | Order seedlings | after clearing done | +0 days, then weekly reminders until done | Confirmed |
| 3 | Planting (acquire and plant seedlings) | season window | Late April to mid July | PENDING CORRECTION, same as stage 1 |
| 4 | First round-weeding | after planting | +3 months | Confirmed |
| 5 | Herbicide | after planting | +3 months, applied with the weeding | Confirmed |
| 6 | First fertilizer | after planting | +4 months | Confirmed; owner says 3 to 4 months, reminder is for end of range |
| 7 | Second round-weeding | after planting | +7 months | Confirmed |
| 8 | Third round-weeding | after planting | +11 months | Confirmed |
| 9 | Second fertilizer | after planting | +12 months | Confirmed (one year after planting) |

Timings are data, not code. They live in `stage_templates` and `season_windows` so they can be edited in the app. The same lifecycle is assumed for every farm until the owner says otherwise. Because the clearing and planting timings are still changing, never hard-code them anywhere.

## Scheduling rules (draft, confirm with the owner)
- Anchor date: every farm has a `schedule_anchor_date`, the date it entered the system (or was acquired). Season windows are resolved from the anchor, never from today.
- Season-window stage: use the first occurrence of the window that ends on or after the anchor date. The planting window is anchored to the Land clearing stage's done date when present, found by its `dry_season` window key. Occurrences never roll forward, so a missed window stays overdue until the stage is done.
- Due moment for a window stage is the window opening. It is overdue once the window has closed without the stage being done.
- After-planting stage: due date = planting date + offset (month-end clamps: 30 November + 3 months = last day of February). Later stages are anchored to the planting date, not to when the previous stage was actually done.
- Planting date = the farm's planting date if set, otherwise the day the planting stage (found by `window_key = planting`) was marked done. If it changes, recompute every stage that is not done.
- After-stage-done stage: find its anchor by `anchor_window_key`; when the anchor is done with a date, due date = anchor done date + `offset_days`. Until then the job is unscheduled. Order seedlings is due on the clearing completion date and repeats weekly until done.
- Any stage can have a manual `due_date_override`. When set, it replaces the computed date. This covers the owner supplying specific dates for particular farms.
- Adding a farm lets the user choose where it is in the process. Stages before that point are marked done, with the done date optional. If the farm is at or past planting, the planting date is required.
- Status (on track, due soon, overdue, done, unscheduled) is derived by the engine from dates. It is not stored.
- Due soon means within the heads-up window (14 days) of the due date or window opening, or inside an open window. Overdue starts the day after the due date or window closing. Order seedlings repeats weekly while not done. While the clearing window is open and clearing is not done, send a window-open reminder every 14 days; the opening day is covered by the regular reminder.

## Alerts
Channel: email only, sent with Resend from the project domain (the domain must be verified in Resend, with SPF and DKIM, or emails will land in spam or not be delivered to the owner). WhatsApp and SMS are out of scope. They can be revisited if the owner asks.
Sent by a daily scheduled job at a fixed hour in Europe/London (default 08:00).

| Type | Eligible when | Notes |
|------|---------------|-------|
| heads_up | from 14 days before the due date (or window opening) until the reminder date | Sent once |
| reminder | from 3 days before until the due date | Sent once |
| overdue | the day after the due date (or window closing), then repeat weekly | Weekly until done |
| window_open | while the clearing window is open, every 14 days after opening | Counts as due soon; no reminder on opening day |
| done_notice | when someone marks a stage done | Event-driven, sent to the other recipients |

An alert is sent only if its occurrence key is not already in the notification log, so a missed daily run catches up without sending duplicates.
Full email spec: docs/EMAILS.md (it supersedes the wording above).

Email wording (plain and short, subject carries the point):
- heads_up: subject `{{farm}}: {{stage}} is due in {{days}} days`. Body: `{{stage}} on {{farm}} is due on {{date}}. Open the app to see the schedule.`
- reminder: subject `{{farm}}: {{stage}} is due in {{days}} days`. Body: `{{stage}} on {{farm}} is due on {{date}}.`
- overdue: subject `{{farm}}: {{stage}} is {{days}} days overdue`. Body: `{{stage}} on {{farm}} was due on {{date}} and is not marked done.`
- done_notice: subject `{{farm}}: {{stage}} marked done`. Body: `{{name}} marked {{stage}} done on {{farm}} on {{date}}.`
Each email links to the farm's page in the app.

## v1 scope
1. Login for two invited users
2. Dashboard: KPI cards, needs attention list, farm progress, season timeline, coming up
3. Farms: list with search, add farm (with current stage and planting date), bulk add, edit
4. Farm detail: stage timeline, notes, photos
5. Mark done: date, note, photos, shows the next stage; undo
6. Alert settings: email recipients, timing, email preview
7. Stage template editor with season windows
8. Daily email alert job, logged and idempotent

Mark done records the completion date, optional note and the signed-in user's display name, then previews the next scheduled stage. A completion can be undone unless later after-planting stages are still done; manual due dates override the schedule until cleared, and changing a completed planting date reschedules open later stages while refusing dates that precede completed work.

## Phase 2 (designed, not built yet)
- Cost tracking per farm (expenses by category, per stage, receipts, in naira)
- Workers and worker payments. The app records payments only and never moves money. A worker payment automatically appears in Costs as Labour for that farm, so nothing is entered twice. Paid and Owed status is tentative.

## Later
- Text-to-update with AI ("cleared Farm B today"), only after v1 works.
- WhatsApp alerts, only if the owner asks.

## Data model (v1)
- `farms`: id, name, location (optional), size_value and size_unit (optional), planting_date (nullable), schedule_anchor_date, notes, created_at
- `stage_templates`: id, position, name, trigger_type (`season_window`, `after_planting` or `after_stage_done`), offset_months, offset_days, window_key, anchor_window_key (nullable as required by trigger)
- `season_windows`: key (`dry_season`, `planting`), start month and day, end month and day (may wrap the year)
- `farm_stages`: id, farm_id, template_id, is_done (boolean), done_date (nullable, may stay empty when a stage was marked done at onboarding), done_by, done_note, due_date_override (nullable). Computed due dates and windows are derived by the engine, not stored.
- `notes`: id, farm_id, farm_stage_id (nullable), body, created_by, created_at
- `photos`: id, farm_id, farm_stage_id (nullable), storage_path, caption, taken_on
- `recipients`: id, name, email, enabled
- `alert_settings`: heads_up_days (14), reminder_days (3), overdue_enabled, overdue_repeat_days (7), window_nudge_days (14), send_hour_london (8)
- `notification_log`: id, farm_stage_id, recipient_id, alert_type, occurrence_key, status, provider_message_id, sent_at. Unique on (farm_stage_id, recipient_id, alert_type, occurrence_key).

Phase 2 will add `expenses`, `workers` and `worker_payments`. Do not build them now.

## Open questions for the owner (TBC)
1. Corrected clearing and planting window months (the owner will supply them).
2. Whether every farm and crop follows this same lifecycle.
3. Email recipient details; editing recipients is the next step.
4. For phase 2: how workers are paid, and whether owed balances should be tracked.
