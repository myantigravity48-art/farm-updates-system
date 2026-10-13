import { compare, format } from "./dates";
import type { CalendarDate, SeasonWindow } from "./types";

const dateFor = (year: number, month: number, day: number): CalendarDate => format(new Date(Date.UTC(year, month - 1, day)));

/** Resolves the first window occurrence whose end is on or after notBefore. */
export function resolveWindow(window: SeasonWindow, notBefore: CalendarDate): { start: CalendarDate; end: CalendarDate } {
  const year = Number(notBefore.slice(0, 4));
  const wraps = window.endMonth < window.startMonth || (window.endMonth === window.startMonth && window.endDay < window.startDay);
  for (const startYear of [year - 1, year, year + 1]) {
    const start = dateFor(startYear, window.startMonth, window.startDay);
    const end = dateFor(startYear + (wraps ? 1 : 0), window.endMonth, window.endDay);
    if (compare(end, notBefore) >= 0) return { start, end };
  }
  throw new Error(`Cannot resolve window ${window.key}`);
}
