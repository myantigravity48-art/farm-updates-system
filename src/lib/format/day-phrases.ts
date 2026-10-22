import { diffInDays, type CalendarDate } from "@/lib/schedule";

/** Describes a date stage relative to today, for example "Due in 5 days" or "3 days late". */
export function dateStagePhrase(today: CalendarDate, dueDate: CalendarDate): string {
  const days = diffInDays(today, dueDate);

  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days > 1) return `Due in ${days} days`;
  if (days === -1) return "1 day late";
  return `${-days} days late`;
}

/**
 * Describes a season-window stage: upcoming ("Opens in 3 days"), open
 * ("Open, closes in 9 days", "Closes today") or closed ("Closed 4 days ago").
 */
export function windowStagePhrase(
  today: CalendarDate,
  windowStart: CalendarDate,
  windowEnd: CalendarDate,
): string {
  const opensIn = diffInDays(today, windowStart);

  if (opensIn >= 0) {
    if (opensIn === 0) return "Opens today";
    if (opensIn === 1) return "Opens tomorrow";
    return `Opens in ${opensIn} days`;
  }

  const closesIn = diffInDays(today, windowEnd);
  if (closesIn === 0) return "Closes today";
  if (closesIn > 0) return `Open, closes in ${closesIn} days`;

  const closedAgo = -closesIn;
  return closedAgo === 1 ? "Closed 1 day ago" : `Closed ${closedAgo} days ago`;
}
