import { diffInDays, parse, type CalendarDate } from "@/lib/schedule";

const ukDate = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const ukShortDate = new Intl.DateTimeFormat("en-GB", {
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

/** Formats a calendar date without the weekday, for example "23 Oct 2026". */
export function formatUkShortDate(date: CalendarDate): string {
  const parts = ukShortDate.formatToParts(parse(date));
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${read("day")} ${read("month")} ${read("year")}`.trim();
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

const londonDateTime = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "Europe/London",
});

/**
 * Formats an ISO timestamp in Europe/London, for example "Fri 23 Oct 2026, 14:05".
 * Returns an empty string when the timestamp cannot be parsed.
 */
export function formatLondonDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const parts = londonDateTime.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";

  return `${part("weekday")} ${part("day")} ${part("month")} ${part("year")}, ${part("hour")}:${part("minute")}`.trim();
}
