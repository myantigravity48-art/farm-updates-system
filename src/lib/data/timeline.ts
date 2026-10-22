import { addDays, format, parse, type CalendarDate, type SeasonWindow } from "@/lib/schedule";

export interface SeasonSegment {
  key: "dry_season" | "planting";
  startPercent: number;
  endPercent: number;
}

export interface SeasonTimeline {
  segments: SeasonSegment[];
  todayPercent: number;
  /** The strip described in words, for the strip's aria-label. */
  label: string;
}

const MONTHS_IN_WORDS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WINDOW_LABELS = { dry_season: "Dry season", planting: "Planting window" } as const;

const roundTo2 = (value: number): number => Math.round(value * 100) / 100;

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/** Position of a calendar date along the 12-month strip, as a percentage. */
export function percentOnStrip(date: CalendarDate): number {
  const parsed = parse(date);
  const monthIndex = parsed.getUTCMonth();
  const day = parsed.getUTCDate();
  const fraction = (monthIndex + (day - 1) / daysInMonth(parsed.getUTCFullYear(), monthIndex)) / 12;
  return roundTo2(fraction * 100);
}

const wrapsYear = (window: SeasonWindow): boolean =>
  window.endMonth < window.startMonth ||
  (window.endMonth === window.startMonth && window.endDay < window.startDay);

const percentForMonthDay = (year: number, month: number, day: number): number =>
  percentOnStrip(format(new Date(Date.UTC(year, month - 1, day))));

function segmentsForWindow(window: SeasonWindow, year: number): SeasonSegment[] {
  const startPercent = percentForMonthDay(year, window.startMonth, window.startDay);
  const endYear = wrapsYear(window) ? year + 1 : year;
  // The closing day is included, so the segment runs to the start of the next day.
  const endPercent = percentOnStrip(
    addDays(format(new Date(Date.UTC(endYear, window.endMonth - 1, window.endDay))), 1),
  );

  if (endPercent > startPercent) {
    return [{ key: window.key, startPercent, endPercent }];
  }

  // The window crosses 31 December: it becomes two segments on the strip.
  const segments: SeasonSegment[] = [];
  if (startPercent < 100) segments.push({ key: window.key, startPercent, endPercent: 100 });
  if (endPercent > 0) segments.push({ key: window.key, startPercent: 0, endPercent });
  return segments;
}

/** Builds the season timeline segments and today's marker from the season window data. */
export function buildSeasonTimeline(
  windows: SeasonWindow[],
  today: CalendarDate,
): SeasonTimeline {
  const year = Number(today.slice(0, 4));
  const segments = windows
    .filter((window) => window.key === "dry_season" || window.key === "planting")
    .flatMap((window) => segmentsForWindow(window, year));

  return {
    segments,
    todayPercent: percentOnStrip(today),
    label: describeSeasonTimeline(windows, today),
  };
}

/** Describes the season windows and today in words, for example "Dry season runs 1 November to 31 March." */
export function describeSeasonTimeline(windows: SeasonWindow[], today: CalendarDate): string {
  const monthAndDay = (month: number, day: number) => `${day} ${MONTHS_IN_WORDS[month - 1]}`;

  const windowPhrases = windows
    .filter((window) => window.key === "dry_season" || window.key === "planting")
    .map(
      (window) =>
        `${WINDOW_LABELS[window.key]} runs ${monthAndDay(window.startMonth, window.startDay)} to ${monthAndDay(window.endMonth, window.endDay)}`,
    );

  const parsed = parse(today);
  const todayPhrase = `Today is ${parsed.getUTCDate()} ${MONTHS_IN_WORDS[parsed.getUTCMonth()]}`;

  return [...windowPhrases, todayPhrase].join(". ") + ".";
}
