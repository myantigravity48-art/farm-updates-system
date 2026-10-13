import { addDays, compare } from "./dates";
import type { CalendarDate, ScheduledStage, Status } from "./types";

/** Derives a stage's display status from today and the heads-up period. */
export function getStatus(stage: ScheduledStage, today: CalendarDate, headsUpDays: number): Status {
  if (stage.isDone) return "done";
  if (stage.kind === "unscheduled") return "unscheduled";
  if (stage.kind === "date") return compare(today, stage.dueDate!) > 0 ? "overdue" : compare(today, addDays(stage.dueDate!, -headsUpDays)) >= 0 ? "due_soon" : "on_track";
  return compare(today, stage.windowEnd!) > 0 ? "overdue" : compare(today, addDays(stage.windowStart!, -headsUpDays)) >= 0 ? "due_soon" : "on_track";
}
