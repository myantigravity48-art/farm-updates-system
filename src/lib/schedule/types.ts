/** A date-only ISO string used for all schedule calculations. */
export type CalendarDate = `${number}-${number}-${number}`;

/** An editable lifecycle stage definition. */
export interface StageTemplate {
  position: number;
  name: string;
  triggerType: "season_window" | "after_planting";
  windowKey?: "dry_season" | "planting";
  offsetMonths?: number;
}

/** A recurring date range, which may cross a calendar year. */
export interface SeasonWindow {
  key: "dry_season" | "planting";
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
}

/** The dates on a farm that determine its schedule. */
export interface FarmInput { plantingDate: CalendarDate | null; anchorDate: CalendarDate; }

/** Persisted completion and override state for one stage. */
export interface StageState { position: number; isDone: boolean; doneDate: CalendarDate | null; dueDateOverride: CalendarDate | null; }

/** Configures the heads-up, reminder, and overdue alert rules. */
export interface AlertSettings { headsUpDays: number; reminderDays: number; overdueEnabled: boolean; overdueRepeatDays: number; }

/** A stage enriched with its derived schedule. */
export interface ScheduledStage {
  position: number;
  name: string;
  kind: "window" | "date" | "unscheduled";
  windowStart?: CalendarDate;
  windowEnd?: CalendarDate;
  dueDate?: CalendarDate;
  isDone: boolean;
  doneDate: CalendarDate | null;
}

/** A derived schedule status, never persisted. */
export type Status = "done" | "unscheduled" | "on_track" | "due_soon" | "overdue";

/** A type of scheduled email notification. */
export type AlertType = "heads_up" | "reminder" | "overdue";

/** An idempotent alert occurrence ready for a caller to deliver. */
export interface DueAlert { position: number; type: AlertType; occurrenceKey: string; }
