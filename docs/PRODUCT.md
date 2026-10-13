# Product

## Purpose
The owner has many farm plots in Nigeria and lives in the UK. Each plot goes through a fixed lifecycle of jobs. The app tells him what is coming up, what is overdue, and lets either user mark a job done. Alerts go out by email.

Users: two, equal permissions (the owner and the person who manages the system). Both can log in, mark jobs done, and receive alerts. More recipients may be added later.

Farms so far: Obi-Umuagbogho, Uzor Timber, Iyanuole, Obaoba. Many more are coming, so every list must scale to 50+ farms (search, bulk add). Size and dimensions per farm come later and are optional.

## Lifecycle (one set of 8 stages per farm)
Early stages follow season windows. Later stages are counted from the planting date.

| # | Stage | Trigger | Rule | Rule status |
|---|-------|---------|------|-------------|
| 1 | Land clearing (cut trees, gather weeds, isolate wood, burn weeds, clear log remnants) | season window | Dry season | PENDING CORRECTION. The owner is correcting the clearing timing and will supply near-final dates. Seed placeholder: November to March |
| 2 | Planting (acquire and plant seedlings) | season window | Late April to mid July | PENDING CORRECTION, same as stage 1. Seedling lead time TBC |
| 3 | First round-weeding | after planting | +3 months | Confirmed |
| 4 | Herbicide on surrounding weeds | after planting | +3 months (placeholder) | TBC |
| 5 | First fertilizer | after planting | +4 months (placeholder) | TBC |
| 6 | Second round-weeding | after planting | +7 months (placeholder: 4 months after stage 3) | TBC |
| 7 | Third round-weeding | after planting | +11 months (placeholder: 4 months after stage 6) | TBC |
| 8 | Second fertilizer | after planting | +12 months | Confirmed (one year after planting) |

Timings are data, not code. They live in `stage_templates` and `season_windows` so they can be edited in the app. The same lifecycle is assumed for every farm until the owner says otherwise. Because the clearing and planting timings are still changing, never hard-code them anywhere.

## Scheduling rules (draft, confirm with the owner)
- Anchor date: every farm has a `schedule_anchor_date`, the date it entered the system (or was acquired). Season windows are resolved from the anchor, never from today.
- Season-window stage: use the first occurrence of the window that ends on or after the anchor date. For stage 2, the anchor is the day stage 1 was marked done, if it was done. Occurrences never roll forward, so a missed window stays overdue until the stage is done.
- Due moment for a window stage is the window opening. It is overdue once the window has closed without the stage being done.
- After-planting stage: due date = planting date + offset (month-end clamps: 30 November + 3 months = last day of February). Later stages are anchored to the planting date, not to when the previous stage was actually done.
- Planting date = the farm's planting date if set, otherwise the day stage 2 was marked done. If it changes, recompute every stage that is not done.
- Any stage can have a manual `due_date_override`. When set, it replaces the computed date. This covers the owner supplying specific dates for particular farms.
- Adding a farm lets the user choose where it is in the process. Stages before that point are marked done, with the done date optional. If the farm is at or past planting, the planting date is required.
- Status (on track, due soon, overdue, done, unscheduled) is derived by the engine from dates. It is not stored.
- Due soon means within the heads-up window (14 days) of the due date or window opening, or inside an open window. Overdue starts the day after the due date or window closing.

## Alerts
Channel: email only, sent with Resend from the project domain (the domain must be verified in Resend, with SPF and DKIM, or emails will land in spam or not be delivered to the owner). WhatsApp and SMS are out of scope. They can be revisited if the owner asks.
Sent by a daily scheduled job at a fixed hour in Europe/London (default 08:00).

| Type | Eligible when | Notes |
|------|---------------|-------|
| heads_up | from 14 days before the due date (or window opening) until the reminder date | Sent once |
| reminder | from 3 days before until the due date | Sent once |
| overdue | the day after the due date (or window closing), then repeat | Repeat interval TBC (proposed every 3 days until done) |
| done_notice | when someone marks a stage done | Event-driven, sent to the other recipients |

An alert is sent only if its occurrence key is not already in the notification log, so a missed daily run catches up without sending duplicates.

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

## Phase 2 (designed, not built yet)
- Cost tracking per farm (expenses by category, per stage, receipts, in naira)
- Workers and worker payments. The app records payments only and never moves money. A worker payment automatically appears in Costs as Labour for that farm, so nothing is entered twice. Paid and Owed status is tentative.

## Later
- Text-to-update with AI ("cleared Farm B today"), only after v1 works.
- WhatsApp alerts, only if the owner asks.

## Data model (v1)
- `farms`: id, name, location (optional), size_value and size_unit (optional), planting_date (nullable), schedule_anchor_date, notes, created_at
- `stage_templates`: id, position, name, trigger_type (`season_window` or `after_planting`), offset_months (nullable), window_key (nullable)
- `season_windows`: key (`dry_season`, `planting`), start month and day, end month and day (may wrap the year)
- `farm_stages`: id, farm_id, template_id, is_done (boolean), done_date (nullable, may stay empty when a stage was marked done at onboarding), done_by, done_note, due_date_override (nullable). Computed due dates and windows are derived by the engine, not stored.
- `notes`: id, farm_id, farm_stage_id (nullable), body, created_by, created_at
- `photos`: id, farm_id, farm_stage_id (nullable), storage_path, caption, taken_on
- `recipients`: id, name, email, enabled
- `alert_settings`: heads_up_days (14), reminder_days (3), overdue_enabled, overdue_repeat_days, send_hour_london (8)
- `notification_log`: id, farm_stage_id, recipient_id, alert_type, occurrence_key, status, provider_message_id, sent_at. Unique on (farm_stage_id, recipient_id, alert_type, occurrence_key).

Phase 2 will add `expenses`, `workers` and `worker_payments`. Do not build them now.

## Open questions for the owner (TBC)
1. Corrected clearing and planting timings (he will supply near-final dates). May be months for the season windows or specific dates per farm.
2. How far ahead of planting season seedlings must be ordered.
3. Weeding spacing: 3, 7 and 11 months after planting, or 3 months and then 4 months after each previous weeding?
4. When the herbicide and the first fertilizer happen, in months after planting.
5. Whether every farm and crop follows this same lifecycle.
6. Overdue repeat interval.
7. Email addresses for all recipients.
8. Whether he wants a nudge while a long window is open (the clearing window can span months, and there is no alert between its opening and its closing).
9. For phase 2: how workers are paid, and whether owed balances should be tracked.
