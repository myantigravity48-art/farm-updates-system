import { describe, expect, it } from "vitest";
import type { CalendarDate } from "@/lib/schedule";
import { dateStagePhrase, windowStagePhrase } from "./day-phrases";

const date = (value: string) => value as CalendarDate;
const today = date("2026-10-22");

describe("dateStagePhrase", () => {
  it("says due today", () => {
    expect(dateStagePhrase(today, date("2026-10-22"))).toBe("Due today");
  });

  it("says due tomorrow", () => {
    expect(dateStagePhrase(today, date("2026-10-23"))).toBe("Due tomorrow");
  });

  it("counts days ahead", () => {
    expect(dateStagePhrase(today, date("2026-11-01"))).toBe("Due in 10 days");
  });

  it("says one day late", () => {
    expect(dateStagePhrase(today, date("2026-10-21"))).toBe("1 day late");
  });

  it("counts days late", () => {
    expect(dateStagePhrase(today, date("2026-10-18"))).toBe("4 days late");
  });
});

describe("windowStagePhrase", () => {
  it("says opens today on the opening day", () => {
    expect(windowStagePhrase(today, date("2026-10-22"), date("2026-12-01"))).toBe("Opens today");
  });

  it("says opens tomorrow", () => {
    expect(windowStagePhrase(today, date("2026-10-23"), date("2026-12-01"))).toBe("Opens tomorrow");
  });

  it("counts days until opening", () => {
    expect(windowStagePhrase(today, date("2026-11-05"), date("2027-01-15"))).toBe("Opens in 14 days");
  });

  it("describes an open window with days until closing", () => {
    expect(windowStagePhrase(today, date("2026-10-10"), date("2026-11-05"))).toBe(
      "Open, closes in 14 days",
    );
  });

  it("says closes today on the closing day", () => {
    expect(windowStagePhrase(today, date("2026-10-10"), date("2026-10-22"))).toBe("Closes today");
  });

  it("says closed one day ago", () => {
    expect(windowStagePhrase(today, date("2026-10-01"), date("2026-10-21"))).toBe("Closed 1 day ago");
  });

  it("counts days since closing", () => {
    expect(windowStagePhrase(today, date("2026-09-01"), date("2026-10-15"))).toBe("Closed 7 days ago");
  });
});
