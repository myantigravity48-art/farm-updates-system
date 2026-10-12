# Product

## Purpose
The owner has many farm plots in Nigeria and lives in the UK. Each plot goes through a fixed lifecycle of jobs. The app tells him what is coming up, what is overdue, and lets either user mark a job done. Alerts go out on WhatsApp, with email as fallback.

Users: two, equal permissions (the owner and the person who manages the system). Both can log in, mark jobs done, and receive alerts. More recipients may be added later.

Farms so far: Obi-Umuagbogho, Uzor Timber, Iyanuole, Obaoba. Many more are coming, so every list must scale to 50+ farms (search, bulk add). Size and dimensions per farm come later and are optional.

## Lifecycle (one set of 8 stages per farm)
Early stages follow season windows. Later stages are counted from the planting date.

| # | Stage | Trigger | Rule | Rule status |
|---|-------|---------|------|-------------|
| 1 | Land clearing (cut trees, gather weeds, isolate wood, burn weeds, clear log remnants) | season window | Dry season | Months TBC (assumed November to March) |
| 2 | Planting (acquire and plant seedlings) | season window | Late April to mid July | Confirmed. Seedling lead time TBC |
| 3 | First round-weeding | after planting | +3 months | Confirmed |
| 4 | Herbicide on surrounding weeds | after planting | +3 months (placeholder) | TBC |
| 5 | First fertilizer | after planting | +4 months (placeholder) | TBC |
| 6 | Second round-weeding | after planting | +7 months (placeholder: 4 months after stage 3) | TBC |
| 7 | Third round-weeding | after planting | +11 months (placeholder: 4 months after stage 6) | TBC |
| 8 | Second fertilizer | after planting | +12 months | Confirmed (one year after planting) |

Timings are data, not code. They live in `stage_templates` and `season_windows` so they can be edited in the app. The same lifecycle is assumed for every farm until the owner says otherwise.

## Scheduling rules (draft, confirm with the owner)
- Season-window stage: the due moment is the window opening. It is overdue once the window has closed without the stage being done. Use the next occurrence of the window that has not ended.
- After-planting stage: due date = planting date + offset. Later stages are anchored to the planting date, not to when the previous stage was actually done.
- Marking planting done sets the farm's planting date and generates due dates for stages 3 to 8. If the planting date changes, recompute every stage that is not done.
- Adding a farm lets the user choose where it is in the process. Stages before that point are marked done, with the done date optional. If the farm is at or past planting, the planting date is required.
- Status (on track, due soon, overdue, done) is derived by the engine from dates. It is not stored.

## Alerts
Channels: WhatsApp (primary), email (fallback). Both can be toggled per recipient.
Sent by a daily scheduled job at a fixed hour in Europe/London (default 08:00).

| Type | When | Notes |
|------|------|-------|
| heads_up | 14 days before the due date (or window opening) | |
| reminder | 3 days before | |
| overdue | the day after the due date (or window closing), then repeat | Repeat interval TBC (proposed every 3 days until done) |
| done_notice | when someone marks a stage done | Sent to the other recipients |

Message wording (WhatsApp utility templates, never marketing):
- heads_up: `{{farm}}: {{stage}} is due in {{days}} days ({{date}}).`
- reminder: `{{farm}}: {{stage}} is due in {{days}} days.`
- overdue: `{{farm}}: {{stage}} was due {{days}} days ago. Not yet marked done.`
- done_notice: `{{farm}}: {{stage}} marked done by {{name}}.`

WhatsApp: Meta Cloud API with pre-approved utility templates. The sender is the owner's WhatsApp Business number, connected via coexistence, unless a dedicated number is set up. Alerts can't go to the sender's own number, so test early. Build email first as the fallback while template approval is pending.

## v1 scope
1. Login for two invited users
2. Dashboard: KPI cards, needs attention list, farm progress, season timeline, coming up
3. Farms: list with search, add farm (with current stage and planting date), bulk add, edit
4. Farm detail: stage timeline, notes, photos
5. Mark done: date, note, photos, shows the next stage; undo
6. Alert settings: recipients, channels, timing, message preview
7. Stage template editor with season windows
8. Daily alert job with WhatsApp and email, logged and idempotent

## Phase 2 (designed, not built yet)
- Cost tracking per farm (expenses by category, per stage, receipts, in naira)
- Workers and worker payments. The app records payments only and never moves money. A worker payment automatically appears in Costs as Labour for that farm, so nothing is entered twice. Paid and Owed status is tentative.

## Later
- Text-to-update with AI ("cleared Farm B today"), only after v1 works.

## Data model (v1)
- `farms`: id, name, location (optional), size_value and size_unit (optional), planting_date (nullable), notes, created_at
- `stage_templates`: id, position, name, trigger_type (`season_window` or `after_planting`), offset_months (nullable), window_key (nullable)
- `season_windows`: key (`dry_season`, `planting`), start month and day, end month and day (may wrap the year)
- `farm_stages`: id, farm_id, template_id, due_date or window start and end, done_date (nullable), done_by, done_note
- `notes`: id, farm_id, farm_stage_id (nullable), body, created_by, created_at
- `photos`: id, farm_id, farm_stage_id (nullable), storage_path, caption, taken_on
- `recipients`: id, name, whatsapp_number, email, whatsapp_enabled, email_enabled
- `alert_settings`: heads_up_days (14), reminder_days (3), overdue_enabled, overdue_repeat_days, send_hour_london (8)
- `notification_log`: id, farm_stage_id, recipient_id, channel, alert_type, status, provider_message_id, sent_at. Unique on (farm_stage_id, recipient_id, channel, alert_type, occurrence key).

Phase 2 will add `expenses`, `workers` and `worker_payments`. Do not build them now.

## Open questions for the owner (TBC)
1. Exact dry season months.
2. How far ahead of planting season seedlings must be ordered.
3. Weeding spacing: 3, 7 and 11 months after planting, or 3 months and then 4 months after each previous weeding?
4. When the herbicide and the first fertilizer happen, in months after planting.
5. Whether every farm and crop follows this same lifecycle.
6. Overdue repeat interval.
7. WhatsApp numbers for all recipients, with country code.
8. For phase 2: how workers are paid, and whether owed balances should be tracked.
