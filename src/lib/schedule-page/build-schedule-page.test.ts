import { describe, expect, it } from "vitest";
import type { CalendarDate, ScheduledStage } from "@/lib/schedule";
import { buildSchedulePage, parseScheduleFilters, type ScheduleFarmInput, type ScheduleFilters } from "./build-schedule-page";

const TODAY = "2026-12-20" as CalendarDate;
const FARM_A = "11111111-1111-4111-8111-111111111111";
const FARM_B = "22222222-2222-4222-8222-222222222222";
const FARM_C = "33333333-3333-4333-8333-333333333333";
const DEFAULT: ScheduleFilters = { farmId: null, status: "all", showCompleted: false };

function dateStage(position: number, name: string, dueDate: CalendarDate, options: Partial<ScheduledStage> = {}): ScheduledStage {
  return { position, name, kind: "date", dueDate, isDone: false, doneDate: null, ...options };
}

function windowStage(position: number, name: string, windowStart: CalendarDate, windowEnd: CalendarDate, options: Partial<ScheduledStage> = {}): ScheduledStage {
  return { position, name, kind: "window", windowStart, windowEnd, isDone: false, doneDate: null, ...options };
}

function farm(id: string, name: string, stages: ScheduleFarmInput["stages"]): ScheduleFarmInput {
  return { id, name, stages };
}

function item(id: string, scheduled: ScheduledStage, dueDateOverride: CalendarDate | null = null, doneByName: string | null = null) {
  return { id, scheduled, dueDateOverride, doneByName };
}

function build(farms: ScheduleFarmInput[], filters = DEFAULT) {
  return buildSchedulePage({ farms, headsUpDays: 14 }, TODAY, filters);
}

describe("buildSchedulePage", () => {
  it("returns no groups when there are no farms", () => {
    expect(build([])).toEqual([]);
  });

  it("groups every status and applies the boundary dates inclusively", () => {
    const rows = farm(FARM_A, "Farm A", [
      item("late", dateStage(1, "Late job", "2026-12-19")),
      item("open", windowStage(2, "Window open today", "2026-12-20", "2026-12-20")),
      item("today", dateStage(3, "Due today", TODAY)),
      item("14", dateStage(4, "Due in 14 days", "2027-01-03")),
      item("window14", windowStage(5, "Window in 14 days", "2027-01-03", "2027-01-10")),
      item("15", dateStage(6, "Due in 15 days", "2027-01-04")),
      item("closed", windowStage(7, "Closed window", "2026-12-01", "2026-12-19")),
    ]);
    const groups = build([rows]);
    expect(groups.map(({ label }) => label)).toEqual(["Overdue", "Open now", "Next 14 days", "January 2027"]);
    expect(groups[0].rows.map(({ stageName }) => stageName)).toEqual(["Late job", "Closed window"]);
    expect(groups[1].rows.map(({ stageName }) => stageName)).toEqual(["Window open today"]);
    expect(groups[2].rows.map(({ stageName }) => stageName)).toEqual(["Due today", "Due in 14 days", "Window in 14 days"]);
    expect(groups[3].rows.map(({ stageName }) => stageName)).toEqual(["Due in 15 days"]);
  });

  it("sorts overdue by lateness, open windows by closing date, and other rows by date, farm and position", () => {
    const groups = build([
      farm(FARM_B, "B farm", [
        item("late-3", dateStage(1, "Three days late", "2026-12-17")),
        item("open-late", windowStage(2, "Closes later", "2026-12-10", "2026-12-22")),
        item("same-b", dateStage(4, "Same date B", "2027-01-02")),
      ]),
      farm(FARM_A, "A farm", [
        item("late-1", dateStage(1, "One day late", "2026-12-19")),
        item("open-soon", windowStage(2, "Closes first", "2026-12-10", "2026-12-20")),
        item("same-a-2", dateStage(2, "Same date A second", "2027-01-02")),
        item("same-a-1", dateStage(1, "Same date A first", "2027-01-02")),
      ]),
    ]);
    expect(groups[0].rows.map(({ stageName }) => stageName)).toEqual(["Three days late", "One day late"]);
    expect(groups[1].rows.map(({ stageName }) => stageName)).toEqual(["Closes first", "Closes later"]);
    expect(groups[2].rows.map(({ stageName }) => stageName)).toEqual(["Same date A first", "Same date A second", "Same date B"]);
  });

  it("labels month groups across a year boundary and exposes manual overrides", () => {
    const groups = build([farm(FARM_A, "Farm A", [
      item("jan", dateStage(1, "January job", "2027-01-20"), "2027-01-20"),
      item("feb", dateStage(2, "February job", "2027-02-01")),
    ])]);
    expect(groups.map(({ label }) => label)).toEqual(["January 2027", "February 2027"]);
    expect(groups[0].rows[0].isOverrideDate).toBe(true);
    expect(groups[1].rows[0].isOverrideDate).toBe(false);
  });

  it("keeps unscheduled reasons in a closed-by-default group", () => {
    const groups = build([farm(FARM_A, "Farm A", [
      item("anchor", { position: 1, name: "Order seedlings", kind: "unscheduled", isDone: false, doneDate: null, unscheduledReason: "needs_anchor_stage", waitingForStage: "Land clearing" }),
      item("planting", { position: 2, name: "First weeding", kind: "unscheduled", isDone: false, doneDate: null, unscheduledReason: "needs_planting_date" }),
    ])]);
    expect(groups).toEqual([{
      label: "Not scheduled yet",
      count: 2,
      collapsed: true,
      rows: expect.arrayContaining([
        expect.objectContaining({ dateText: "Starts when Land clearing is marked done" }),
        expect.objectContaining({ dateText: "Date set once planting is done" }),
      ]),
    }]);
  });

  it("shows only dated completions from the inclusive 60-day window, newest first", () => {
    const completed = (position: number, name: string, doneDate: CalendarDate): ScheduledStage => ({
      position, name, kind: "date", dueDate: doneDate, isDone: true, doneDate,
    });
    const groups = build([farm(FARM_A, "Farm A", [
      item("boundary", completed(1, "Boundary", "2026-10-21"), null, "Sam"),
      item("newest", completed(2, "Newest", "2026-12-20"), null, "Alex"),
      item("old", completed(3, "Old", "2026-10-20")),
      item("no-date", { position: 4, name: "No date", kind: "unscheduled", isDone: true, doneDate: null }),
    ])], { ...DEFAULT, showCompleted: true });
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe("Recently completed");
    expect(groups[0].rows.map(({ stageName }) => stageName)).toEqual(["Newest", "Boundary"]);
    expect(groups[0].rows[0].phrase).toContain("Done Sun 20 Dec 2026 by Alex");
    expect(groups[0].rows[1].phrase).toContain("by Sam");
    expect(groups[0].rows.every(({ canMarkDone }) => !canMarkDone)).toBe(true);
  });

  it("filters by farm, status, and completed visibility alone and together", () => {
    const farms = [
      farm(FARM_A, "A farm", [item("a-late", dateStage(1, "Late", "2026-12-19")), item("a-soon", dateStage(2, "Soon", "2026-12-23")), item("a-upcoming", dateStage(3, "Upcoming", "2027-01-10")), item("a-done", { position: 4, name: "Done", kind: "date", dueDate: "2026-12-18", isDone: true, doneDate: "2026-12-18" })]),
      farm(FARM_B, "B farm", [item("b-late", dateStage(1, "Late B", "2026-12-18"))]),
    ];
    expect(build(farms, { ...DEFAULT, farmId: FARM_A }).flatMap((g) => g.rows).every((row) => row.farmId === FARM_A)).toBe(true);
    expect(build(farms, { ...DEFAULT, status: "overdue" }).flatMap((g) => g.rows).every((row) => row.status === "overdue")).toBe(true);
    expect(build(farms, { ...DEFAULT, status: "due-soon" }).flatMap((g) => g.rows).map((row) => row.stageName)).toEqual(["Soon"]);
    expect(build(farms, { ...DEFAULT, status: "upcoming" }).flatMap((g) => g.rows).map((row) => row.stageName)).toEqual(["Upcoming"]);
    expect(build(farms, { ...DEFAULT, showCompleted: true }).at(-1)?.label).toBe("Recently completed");
    expect(build(farms, { farmId: FARM_A, status: "due-soon", showCompleted: true }).flatMap((g) => g.rows).map((row) => row.stageName)).toEqual(["Soon", "Done"]);
  });
});

describe("parseScheduleFilters", () => {
  it("accepts valid scalar values and ignores unknown query values", () => {
    expect(parseScheduleFilters({ farmId: FARM_A, status: "upcoming", showCompleted: "true", ignored: "x" })).toEqual({ farmId: FARM_A, status: "upcoming", showCompleted: true });
    expect(parseScheduleFilters({ farmId: FARM_B, status: "due-soon", showCompleted: "false" })).toEqual({ farmId: FARM_B, status: "due-soon", showCompleted: false });
    expect(parseScheduleFilters({ farmId: FARM_C, status: "overdue" })).toEqual({ farmId: FARM_C, status: "overdue", showCompleted: false });
  });

  it("ignores repeated parameters, unknown farm id formats, and injection-style strings", () => {
    expect(parseScheduleFilters({ farmId: [FARM_A, FARM_B], status: ["overdue", "upcoming"], showCompleted: ["true", "false"] })).toEqual(DEFAULT);
    expect(parseScheduleFilters({ farmId: "not-a-uuid", status: "delete from farms", showCompleted: "true; DROP TABLE farms" })).toEqual({ ...DEFAULT, showCompleted: false });
    expect(parseScheduleFilters(new URLSearchParams("farmId=x&farmId=y&status=overdue&status=upcoming&showCompleted=true&showCompleted=false"))).toEqual(DEFAULT);
    expect(parseScheduleFilters({ farmId: "11111111-1111-4111-8111-111111111111%27%20OR%201%3D1", status: "<script>", showCompleted: "yes" })).toEqual(DEFAULT);
  });
});
