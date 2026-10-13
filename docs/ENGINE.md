# Schedule engine

Pure date-computation module in `src/lib/schedule/`. No database, network, React, Next.js, or Supabase imports. No `new Date()` without explicit inputs. All date arithmetic is UTC. Today is always passed in by the caller.

## Files

| File | Purpose |
|------|---------|
| `types.ts` | All type definitions: `CalendarDate`, `StageTemplate`, `SeasonWindow`, `FarmInput`, `StageState`, `AlertSettings`, `ScheduledStage`, `Status`, `AlertType`, `DueAlert` |
| `dates.ts` | Calendar-date arithmetic: parse, format, addDays, diffInDays, compare, addMonths |
| `windows.ts` | Season window resolution: resolveWindow |
| `schedule.ts` | Core scheduler: computeSchedule |
| `status.ts` | Status derivation: getStatus |
| `alerts.ts` | Alert generation: getDueAlerts |
| `london.ts` | London civil time: todayInLondon, isSendHourInLondon |
| `defaults.ts` | Placeholder stage templates, season windows, and alert settings (data only, never imported by engine logic) |
| `index.ts` | Re-exports everything |

## Rules as implemented

### Calendar dates
- All dates are ISO `YYYY-MM-DD` strings (`CalendarDate` type) representing UTC calendar dates with no time component.
- `addMonths` clamps the day to the target month's last day (e.g. 30 Nov + 3 months = 28 Feb, or 29 Feb in a leap year).

### Season windows
- A `SeasonWindow` has start and end month/day. It may wrap the calendar year (e.g. dry season Nov–Mar).
- `resolveWindow(window, notBefore)` returns the first occurrence whose end is on or after `notBefore`.
- Year-wrapping is handled by checking start years `[year-1, year, year+1]` where year comes from `notBefore`.
- A missed window stays overdue (no roll-forward). The window remains anchored to the same occurrence until the stage is done.

### Schedule computation (`computeSchedule`)
- **Inputs**: stage templates, season windows, farm input (plantingDate, anchorDate), stage states (isDone, doneDate, dueDateOverride).
- **Outputs**: array of `ScheduledStage`, one per template.
- **Planting date**: `farm.plantingDate`, else the done date of the planting stage (the template with `windowKey === "planting"`), else `null`.
- **Planting window anchor**: the clearing stage's done date if it has one, else `farm.anchorDate`. The clearing stage is the first template with `triggerType === "season_window"` and `windowKey !== "planting"`.
- **Due date override**: if a stage has `dueDateOverride`, it replaces any computed date. The stage is returned with `kind: "date"`.
- **After-planting stages**: `dueDate = addMonths(plantingDate, offsetMonths)`. If planting date is null, the stage is `kind: "unscheduled"`. Stages anchor to the planting date, never to the previous stage's completion.
- **Season-window stages**: resolved via `resolveWindow` using the appropriate anchor.

### Status (`getStatus`)
- **Inputs**: a `ScheduledStage`, today (`CalendarDate`), headsUpDays.
- **Returns**: `Status` = `"done"` | `"unscheduled"` | `"on_track"` | `"due_soon"` | `"overdue"`.
- Done always wins (checked first).
- Unscheduled stages have no dates and no status.
- For **date** stages: overdue when today > dueDate; due_soon when today >= dueDate − headsUpDays; else on_track.
- For **window** stages: overdue when today > windowEnd; due_soon when today >= windowStart − headsUpDays; else on_track. Due_soon spans from headsUpDays before opening through the closing date.

### Alerts (`getDueAlerts`)
- **Inputs**: scheduled stages, today, alert settings, set of already-sent occurrence keys.
- **Returns**: array of `DueAlert` (position, type, occurrenceKey).
- Done and unscheduled stages produce no alerts.
- R = the reminder reference date = dueDate for date stages, windowStart for window stages.
- C = the closing date = dueDate for date stages, windowEnd for window stages.
- **heads_up**: eligible from R − headsUpDays (inclusive) to R − reminderDays (exclusive). Sent once.
- **reminder**: eligible from R − reminderDays (inclusive) through R (inclusive). Sent once.
- **overdue**: eligible from C + 1 onward, repeating. Repeat index = `floor(diffInDays(C+1, today) / overdueRepeatDays)`.
- Only the currently eligible alert class fires (no catch-up across classes).
- Already-sent keys are filtered out for idempotency.
- `done_notice` is not in the engine (it is event-driven, handled at the app layer).
- During an open window (past the opening, before closing), no alerts fire — the reminder window has passed and overdue has not started.

## Alert occurrence key format

```
{position}:{type}:{reference_date}
{position}:{type}:{closing_date}:{repeat_index}
```

| Type | Key format | Example |
|------|-----------|---------|
| `heads_up` | `{position}:heads_up:{R}` | `1:heads_up:2027-06-15` |
| `reminder` | `{position}:reminder:{R}` | `1:reminder:2027-06-15` |
| `overdue` | `{position}:overdue:{C}:{n}` | `1:overdue:2027-06-15:0` |

Where R is the due date or window opening date, C is the due date or window closing date, and n is the repeat index (0-based, increments every `overdueRepeatDays` days).

## Public functions

### `computeSchedule(templates, windows, farm, stages): ScheduledStage[]`
Derives all stage windows and due dates from editable data and farm state.

### `getStatus(stage, today, headsUpDays): Status`
Derives a single stage's display status from today and the heads-up period.

### `getDueAlerts(scheduled, today, settings, alreadySent): DueAlert[]`
Returns all eligible unsent alert occurrences for a set of scheduled stages.

### `todayInLondon(now: Date): CalendarDate`
Returns today's calendar date in Europe/London for an explicit instant.

### `isSendHourInLondon(now: Date, hour: number): boolean`
Checks whether an explicit instant is within the configured London send hour.

### `addMonths(date, months): CalendarDate`
Adds whole months with day clamping.

### `addDays(date, days): CalendarDate`
Adds whole calendar days.

### `diffInDays(start, end): number`
Returns the difference in whole UTC calendar days.

### `resolveWindow(window, notBefore): { start, end }`
Resolves the first window occurrence ending on or after a given date.

## London time (`london.ts`)
- Uses `Intl.DateTimeFormat` with `timeZone: "Europe/London"` to derive the civil date and hour for any UTC instant.
- Handles both UK daylight saving transitions in 2026: clocks forward March 29 at 01:00 UTC, clocks back October 25 at 01:00 UTC.
- Never uses the device or server time zone.

## Tests
15 Vitest tests in `schedule.test.ts` covering:
- Month-end clamping (addMonths) including leap year Feb 29
- Leap day and year-boundary diffInDays
- Season window resolution for wrapped and single-year windows
- Full schedule computation with planting offsets, done-date derivation, overrides, unscheduled stages, missed windows
- Status boundaries for date and window stages, done and unscheduled priority
- Alert eligibility boundaries for heads_up, reminder, and overdue (including repeat keys)
- Alert idempotency, stage eligibility filtering, window-based alert timing
- London civil date and send-hour across both 2026 DST transitions

The `test:tz` script runs all tests under `Pacific/Auckland` and `America/Los_Angeles` to ensure no local-timezone leakage.
