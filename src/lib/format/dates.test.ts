import { describe, expect, it } from "vitest";
import type { CalendarDate } from "@/lib/schedule";
import { formatDayCount, formatUkDate } from "./dates";

const date = (value: string) => value as CalendarDate;

describe("formatUkDate", () => {
  it("formats a calendar date in UK style", () => {
    expect(formatUkDate(date("2026-10-23"))).toBe("Fri 23 Oct 2026");
  });

  it("formats leap days without shifting to local time", () => {
    expect(formatUkDate(date("2028-02-29"))).toBe("Tue 29 Feb 2028");
  });
});

describe("formatDayCount", () => {
  const today = date("2026-10-21");

  it("says today", () => {
    expect(formatDayCount(today, date("2026-10-21"))).toBe("today");
  });

  it("says tomorrow", () => {
    expect(formatDayCount(today, date("2026-10-22"))).toBe("tomorrow");
  });

  it("counts days ahead", () => {
    expect(formatDayCount(today, date("2026-10-26"))).toBe("in 5 days");
  });

  it("counts one day late", () => {
    expect(formatDayCount(today, date("2026-10-20"))).toBe("1 day late");
  });

  it("counts several days late", () => {
    expect(formatDayCount(today, date("2026-10-18"))).toBe("3 days late");
  });
});
