import type { CalendarDate } from "./types";

const DAY_MS = 86_400_000;

/** Parses a CalendarDate into a UTC midnight Date after validating it. */
export function parse(value: CalendarDate): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error(`Invalid CalendarDate: ${value}`);
  const [, yearText, monthText, dayText] = match;
  const date = new Date(Date.UTC(Number(yearText), Number(monthText) - 1, Number(dayText)));
  if (date.getUTCFullYear() !== Number(yearText) || date.getUTCMonth() !== Number(monthText) - 1 || date.getUTCDate() !== Number(dayText)) throw new Error(`Invalid CalendarDate: ${value}`);
  return date;
}

/** Formats a UTC Date as a CalendarDate. */
export function format(date: Date): CalendarDate {
  return `${date.getUTCFullYear().toString().padStart(4, "0")}-${(date.getUTCMonth() + 1).toString().padStart(2, "0")}-${date.getUTCDate().toString().padStart(2, "0")}` as CalendarDate;
}

/** Adds whole calendar days using UTC arithmetic. */
export function addDays(date: CalendarDate, days: number): CalendarDate {
  return format(new Date(parse(date).getTime() + days * DAY_MS));
}

/** Returns end minus start in whole UTC calendar days. */
export function diffInDays(start: CalendarDate, end: CalendarDate): number {
  return (parse(end).getTime() - parse(start).getTime()) / DAY_MS;
}

/** Compares two CalendarDates without using a local time zone. */
export function compare(left: CalendarDate, right: CalendarDate): number {
  return Math.sign(diffInDays(right, left));
}

/** Adds whole months, clamping the day to the target month's last day. */
export function addMonths(date: CalendarDate, months: number): CalendarDate {
  const parsed = parse(date);
  const targetMonthIndex = parsed.getUTCMonth() + months;
  const targetYear = parsed.getUTCFullYear() + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  return format(new Date(Date.UTC(targetYear, targetMonth, Math.min(parsed.getUTCDate(), lastDay))));
}
