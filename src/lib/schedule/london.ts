import type { CalendarDate } from "./types";

const londonParts = (now: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(now);
const part = (parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value;

/** Returns today's calendar date in Europe/London for an explicit instant. */
export function todayInLondon(now: Date): CalendarDate {
  const parts = londonParts(now);
  return `${part(parts, "year")}-${part(parts, "month")}-${part(parts, "day")}` as CalendarDate;
}

/** Checks whether an explicit instant is within the configured London send hour. */
export function isSendHourInLondon(now: Date, hour: number): boolean {
  return Number(part(londonParts(now), "hour")) === hour;
}
