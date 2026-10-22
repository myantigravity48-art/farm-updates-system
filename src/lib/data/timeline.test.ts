import { describe, expect, it } from "vitest";
import type { CalendarDate } from "@/lib/schedule";
import { buildSeasonTimeline, describeSeasonTimeline, percentOnStrip } from "./timeline";

const date = (value: string) => value as CalendarDate;

const drySeason = {
  key: "dry_season" as const,
  startMonth: 11,
  startDay: 1,
  endMonth: 3,
  endDay: 31,
};

const planting = {
  key: "planting" as const,
  startMonth: 4,
  startDay: 25,
  endMonth: 7,
  endDay: 15,
};

describe("percentOnStrip", () => {
  it("puts 1 January at the start of the strip", () => {
    expect(percentOnStrip(date("2026-01-01"))).toBe(0);
  });

  it("uses the month's own length at mid-month", () => {
    // (0 + 14/31) / 12
    expect(percentOnStrip(date("2026-01-15"))).toBe(3.76);
    // (1 + 14/28) / 12, non-leap February
    expect(percentOnStrip(date("2026-02-15"))).toBe(12.5);
    // (1 + 14/29) / 12, leap-year February
    expect(percentOnStrip(date("2024-02-15"))).toBe(12.36);
  });

  it("puts 31 December near the end without reaching 100", () => {
    // (11 + 30/31) / 12
    expect(percentOnStrip(date("2026-12-31"))).toBe(99.73);
  });
});

describe("buildSeasonTimeline", () => {
  it("splits a year-wrapping window into two segments", () => {
    const timeline = buildSeasonTimeline([drySeason], date("2026-10-22"));

    expect(timeline.segments).toEqual([
      { key: "dry_season", startPercent: 83.33, endPercent: 100 },
      { key: "dry_season", startPercent: 0, endPercent: 25 },
    ]);
  });

  it("keeps a non-wrapping window in one segment", () => {
    const timeline = buildSeasonTimeline([planting], date("2026-10-22"));

    expect(timeline.segments).toEqual([
      { key: "planting", startPercent: 31.67, endPercent: 54.03 },
    ]);
  });

  it("positions 1 January, mid-month and 31 December", () => {
    expect(buildSeasonTimeline([planting], date("2026-01-01")).todayPercent).toBe(0);
    expect(buildSeasonTimeline([planting], date("2026-06-15")).todayPercent).toBe(45.56);
    expect(buildSeasonTimeline([planting], date("2026-12-31")).todayPercent).toBe(99.73);
  });
});

describe("describeSeasonTimeline", () => {
  it("states the windows and today in words", () => {
    expect(describeSeasonTimeline([drySeason, planting], date("2026-10-22"))).toBe(
      "Dry season runs 1 November to 31 March. Planting window runs 25 April to 15 July. Today is 22 October.",
    );
  });
});
