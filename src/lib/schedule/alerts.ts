import { addDays, compare, diffInDays } from "./dates";
import type { AlertSettings, CalendarDate, DueAlert, ScheduledStage } from "./types";

/** Returns eligible unsent alert occurrences, including catch-up and repeat rules. */
export function getDueAlerts(scheduled: ScheduledStage[], today: CalendarDate, settings: AlertSettings, alreadySent: Set<string>): DueAlert[] {
  const alerts: DueAlert[] = [];
  for (const stage of scheduled) {
    if (stage.isDone || stage.kind === "unscheduled") continue;
    const reminderAt = stage.kind === "date" ? stage.dueDate! : stage.windowStart!;
    const closesAt = stage.kind === "date" ? stage.dueDate! : stage.windowEnd!;
    const headsUpStart = addDays(reminderAt, -settings.headsUpDays);
    const reminderStart = addDays(reminderAt, -settings.reminderDays);
    const add = (type: DueAlert["type"], occurrenceKey: string, days?: number) => { if (!alreadySent.has(occurrenceKey)) alerts.push({ position: stage.position, type, occurrenceKey, ...(days === undefined ? {} : { days }) }); };
    if (stage.kind === "window" && settings.windowNudgeDays > 0 && compare(today, stage.windowStart!) >= 0 && compare(today, stage.windowEnd!) <= 0) {
      const ordered = [...scheduled].sort((a, b) => a.position - b.position);
      const earlier = ordered.filter((candidate) => candidate.position < stage.position);
      if (earlier.every((candidate) => candidate.isDone)) {
        const k = Math.floor(diffInDays(stage.windowStart!, today) / settings.windowNudgeDays);
        if (k >= 1) add("window_open", `${stage.position}:window_open:${stage.windowStart}:${k}`, diffInDays(today, stage.windowEnd!));
      }
    }
    if (compare(today, headsUpStart) >= 0 && compare(today, reminderStart) < 0) add("heads_up", `${stage.position}:heads_up:${reminderAt}`);
    else if (compare(today, reminderStart) >= 0 && compare(today, reminderAt) <= 0) add("reminder", `${stage.position}:reminder:${reminderAt}`);
    else if (settings.overdueEnabled && compare(today, closesAt) > 0) {
      const n = Math.floor(diffInDays(addDays(closesAt, 1), today) / settings.overdueRepeatDays);
      add("overdue", `${stage.position}:overdue:${closesAt}:${n}`);
    }
  }
  return alerts;
}
