import { diffInDays, parse, type CalendarDate } from "@/lib/schedule";

const ukDate = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** Formats a calendar date for the UI, for example "Fri 23 Oct 2026". */
export function formatUkDate(date: CalendarDate): string {
  const parts = ukDate.formatToParts(parse(date));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("weekday")} ${part("day")} ${part("month")} ${part("year")}`.trim();
}

/** Describes the distance from today, for example "today", "in 5 days" or "3 days late". */
export function formatDayCount(today: CalendarDate, target: CalendarDate): string {
  const days = diffInDays(today, target);

  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days > 1) return `in ${days} days`;
  if (days === -1) return "1 day late";
  return `${Math.abs(days)} days late`;
}
