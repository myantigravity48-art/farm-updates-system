import { describe, expect, it } from "vitest";
import { getGreeting, greetingForHour, londonHour } from "./greeting";

describe("greetingForHour", () => {
  it("greets before 12 london", () => {
    expect(greetingForHour(0)).toBe("Good morning");
    expect(greetingForHour(5)).toBe("Good morning");
    expect(greetingForHour(11)).toBe("Good morning");
  });

  it("greets from 12 to 17", () => {
    expect(greetingForHour(12)).toBe("Good afternoon");
    expect(greetingForHour(17)).toBe("Good afternoon");
  });

  it("greets from 18", () => {
    expect(greetingForHour(18)).toBe("Good evening");
    expect(greetingForHour(23)).toBe("Good evening");
  });
});

describe("londonHour", () => {
  // January London is on GMT, so the UTC hour equals the London hour.
  it("reads hours across the day in winter", () => {
    expect(londonHour(new Date("2026-01-15T00:30:00Z"))).toBe(0);
    expect(londonHour(new Date("2026-01-15T05:00:00Z"))).toBe(5);
    expect(londonHour(new Date("2026-01-15T11:59:00Z"))).toBe(11);
    expect(londonHour(new Date("2026-01-15T12:00:00Z"))).toBe(12);
    expect(londonHour(new Date("2026-01-15T17:30:00Z"))).toBe(17);
    expect(londonHour(new Date("2026-01-15T18:30:00Z"))).toBe(18);
    expect(londonHour(new Date("2026-01-15T23:30:00Z"))).toBe(23);
  });

  // 2026 clocks forward on 29 March at 01:00 UTC and back on 25 October at 01:00 UTC.
  it("tracks London across both daylight saving changes", () => {
    expect(londonHour(new Date("2026-03-29T00:30:00Z"))).toBe(0);
    expect(londonHour(new Date("2026-03-29T01:30:00Z"))).toBe(2);
    expect(londonHour(new Date("2026-10-25T00:30:00Z"))).toBe(1);
    expect(londonHour(new Date("2026-10-25T01:30:00Z"))).toBe(1);
  });
});

describe("getGreeting", () => {
  it("uses the London hour for the greeting", () => {
    expect(getGreeting(new Date("2026-01-15T11:30:00Z"))).toBe("Good morning");
    expect(getGreeting(new Date("2026-01-15T12:30:00Z"))).toBe("Good afternoon");
    expect(getGreeting(new Date("2026-01-15T18:30:00Z"))).toBe("Good evening");
  });

  it("appends a display name when one exists", () => {
    expect(getGreeting(new Date("2026-01-15T11:30:00Z"), "Sam Fields")).toBe(
      "Good morning, Sam Fields",
    );
  });

  it("gives the greeting alone without a name", () => {
    expect(getGreeting(new Date("2026-01-15T11:30:00Z"), null)).toBe("Good morning");
    expect(getGreeting(new Date("2026-01-15T11:30:00Z"), "")).toBe("Good morning");
    expect(getGreeting(new Date("2026-01-15T11:30:00Z"), "   ")).toBe("Good morning");
  });
});
