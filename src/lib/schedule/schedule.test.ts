import { describe, expect, it } from "vitest";

import {
  addMonths,
  computeSchedule,
  diffInDays,
  getDueAlerts,
  getStatus,
  isSendHourInLondon,
  resolveWindow,
  todayInLondon,
  type AlertSettings,
  type CalendarDate,
  type FarmInput,
  type ScheduledStage,
  type SeasonWindow,
  type StageState,
  type StageTemplate,
} from "@/lib/schedule";

const drySeason: SeasonWindow = { key: "dry_season", startMonth: 11, startDay: 1, endMonth: 3, endDay: 31 };
const plantingWindow: SeasonWindow = { key: "planting", startMonth: 4, startDay: 25, endMonth: 7, endDay: 15 };
const templates: StageTemplate[] = [
  { position: 1, name: "Clearing", triggerType: "season_window", windowKey: "dry_season" },
  { position: 2, name: "Planting", triggerType: "season_window", windowKey: "planting" },
  { position: 3, name: "Weeding", triggerType: "after_planting", offsetMonths: 3 },
  { position: 4, name: "Herbicide", triggerType: "after_planting", offsetMonths: 3 },
  { position: 5, name: "Fertilizer", triggerType: "after_planting", offsetMonths: 4 },
  { position: 6, name: "Second weeding", triggerType: "after_planting", offsetMonths: 7 },
  { position: 7, name: "Third weeding", triggerType: "after_planting", offsetMonths: 11 },
  { position: 8, name: "Second fertilizer", triggerType: "after_planting", offsetMonths: 12 },
];
const farm = (plantingDate: FarmInput["plantingDate"] = null): FarmInput => ({ anchorDate: "2026-10-12", plantingDate });
const states = (overrides: Partial<StageState>[] = []): StageState[] => templates.map((template, index) => ({ position: template.position, isDone: false, doneDate: null, dueDateOverride: null, ...overrides[index] }));
const settings: AlertSettings = { headsUpDays: 14, reminderDays: 3, overdueEnabled: true, overdueRepeatDays: 3 };

describe("date arithmetic", () => {
  it("clamps month-end additions", () => {
    expect(addMonths("2026-11-30", 3)).toBe("2027-02-28");
    expect(addMonths("2027-11-30", 3)).toBe("2028-02-29");
    expect(addMonths("2027-01-31", 1)).toBe("2027-02-28");
    expect(addMonths("2027-03-31", 1)).toBe("2027-04-30");
    expect(addMonths("2026-12-31", 12)).toBe("2027-12-31");
  });

  it("calculates date differences across leap days and years", () => {
    expect(diffInDays("2028-02-28", "2028-03-01")).toBe(2);
    expect(diffInDays("2026-12-31", "2027-01-01")).toBe(1);
  });
});

describe("season windows", () => {
  it("resolves wrapped and single-year occurrences", () => {
    expect(resolveWindow(drySeason, "2026-10-12")).toEqual({ start: "2026-11-01", end: "2027-03-31" });
    expect(resolveWindow(drySeason, "2027-01-15")).toEqual({ start: "2026-11-01", end: "2027-03-31" });
    expect(resolveWindow(drySeason, "2027-04-02")).toEqual({ start: "2027-11-01", end: "2028-03-31" });
    expect(resolveWindow(drySeason, "2027-03-31")).toEqual({ start: "2026-11-01", end: "2027-03-31" });
    expect(resolveWindow(plantingWindow, "2027-05-01")).toEqual({ start: "2027-04-25", end: "2027-07-15" });
  });
});

describe("computeSchedule", () => {
  it("calculates windows and planting offsets", () => {
    const schedule = computeSchedule(templates, [drySeason, plantingWindow], farm(), states());
    expect(schedule[0]).toMatchObject({ windowStart: "2026-11-01", windowEnd: "2027-03-31" });
    expect(schedule[1]).toMatchObject({ windowStart: "2027-04-25", windowEnd: "2027-07-15" });
    const planted = computeSchedule(templates, [drySeason, plantingWindow], farm("2027-05-10"), states());
    expect(planted[2].dueDate).toBe("2027-08-10");
    expect(planted[7].dueDate).toBe("2028-05-10");
  });

  it("clamps long offsets and derives planting date from completed planting", () => {
    expect(computeSchedule(templates, [drySeason, plantingWindow], farm("2027-05-31"), states())[6].dueDate).toBe("2028-04-30");
    expect(computeSchedule(templates, [drySeason, plantingWindow], farm(), states([{},{ isDone: true, doneDate: "2027-05-10" }]))[2].dueDate).toBe("2027-08-10");
  });

  it("recomputes planting schedules, applies overrides, and leaves missing planting unscheduled", () => {
    expect(computeSchedule(templates, [drySeason, plantingWindow], farm("2027-05-11"), states())[2].dueDate).toBe("2027-08-11");
    expect(computeSchedule(templates, [drySeason, plantingWindow], farm("2027-06-11"), states())[2].dueDate).toBe("2027-09-11");
    expect(computeSchedule(templates, [drySeason, plantingWindow], farm("2027-05-10"), states([{},{},{ dueDateOverride: "2027-08-19" }]))[2]).toMatchObject({ kind: "date", dueDate: "2027-08-19" });
    expect(computeSchedule(templates, [drySeason, plantingWindow], farm(), states())[2].kind).toBe("unscheduled");
  });

  it("does not roll a missed window forward and retains done stages without dates", () => {
    const schedule = computeSchedule(templates, [drySeason, plantingWindow], { anchorDate: "2026-12-01", plantingDate: null }, states([{ isDone: true }]));
    expect(schedule[0]).toMatchObject({ windowStart: "2026-11-01", windowEnd: "2027-03-31", isDone: true, doneDate: null });
    expect(getStatus(schedule[0], "2027-04-02", 14)).toBe("done");
    const notDone = computeSchedule(templates, [drySeason, plantingWindow], { anchorDate: "2026-12-01", plantingDate: null }, states());
    expect(getStatus(notDone[0], "2027-04-02", 14)).toBe("overdue");
  });
});

describe("getStatus", () => {
  const dated: ScheduledStage = { position: 1, name: "Date", kind: "date", dueDate: "2027-06-15", isDone: false, doneDate: null };
  const windowed: ScheduledStage = { position: 2, name: "Window", kind: "window", windowStart: "2027-06-15", windowEnd: "2027-06-30", isDone: false, doneDate: null };
  it("handles date and window boundaries", () => {
    expect(getStatus(dated, "2027-05-31", 14)).toBe("on_track");
    expect(getStatus(dated, "2027-06-01", 14)).toBe("due_soon");
    expect(getStatus(dated, "2027-06-15", 14)).toBe("due_soon");
    expect(getStatus(dated, "2027-06-16", 14)).toBe("overdue");
    expect(getStatus(windowed, "2027-05-31", 14)).toBe("on_track");
    expect(getStatus(windowed, "2027-06-15", 14)).toBe("due_soon");
    expect(getStatus(windowed, "2027-06-30", 14)).toBe("due_soon");
    expect(getStatus(windowed, "2027-07-01", 14)).toBe("overdue");
  });
  it("prioritises done and unscheduled", () => {
    expect(getStatus({ ...dated, isDone: true }, "2027-06-16", 14)).toBe("done");
    expect(getStatus({ position: 3, name: "No date", kind: "unscheduled", isDone: false, doneDate: null }, "2027-06-16", 14)).toBe("unscheduled");
  });
});

describe("getDueAlerts", () => {
  const dated: ScheduledStage = { position: 1, name: "Date", kind: "date", dueDate: "2027-06-15", isDone: false, doneDate: null };
  const types = (today: CalendarDate, value = settings, sent = new Set<string>()) => getDueAlerts([dated], today, value, sent).map(({ type, occurrenceKey }) => ({ type, occurrenceKey }));
  it("sends heads-up, reminder, and repeating overdue alerts at their boundaries", () => {
    expect(types("2027-06-01")[0].type).toBe("heads_up");
    expect(types("2027-06-11")[0].type).toBe("heads_up");
    expect(types("2027-06-12")[0].type).toBe("reminder");
    expect(types("2027-06-15")[0].type).toBe("reminder");
    expect(types("2027-06-16")[0]).toMatchObject({ type: "overdue", occurrenceKey: "1:overdue:2027-06-15:0" });
    expect(types("2027-06-18")[0].occurrenceKey).toBe("1:overdue:2027-06-15:0");
    expect(types("2027-06-19")[0].occurrenceKey).toBe("1:overdue:2027-06-15:1");
  });
  it("applies alert options, idempotency, and stage eligibility", () => {
    expect(types("2027-06-16", { ...settings, overdueEnabled: false })).toEqual([]);
    expect(types("2027-06-01", settings, new Set(["1:heads_up:2027-06-15"]))).toEqual([]);
    expect(getDueAlerts([{ ...dated, isDone: true }, { position: 2, name: "No date", kind: "unscheduled", isDone: false, doneDate: null }], "2027-06-01", settings, new Set())).toEqual([]);
  });
  it("catches up only the currently eligible alert class", () => {
    expect(types("2027-06-05")[0].type).toBe("heads_up");
    expect(types("2027-06-13")[0].type).toBe("reminder");
  });
  it("uses window opening for reminders and closing for overdue alerts", () => {
    const windowed: ScheduledStage = { position: 2, name: "Window", kind: "window", windowStart: "2027-06-15", windowEnd: "2027-06-30", isDone: false, doneDate: null };
    expect(getDueAlerts([windowed], "2027-06-12", settings, new Set())[0].type).toBe("reminder");
    expect(getDueAlerts([windowed], "2027-06-20", settings, new Set())).toEqual([]);
    expect(getDueAlerts([windowed], "2027-07-01", settings, new Set())[0].type).toBe("overdue");
  });
});

describe("London time", () => {
  it("uses London civil time across daylight saving transitions", () => {
    expect(todayInLondon(new Date("2026-03-29T00:30:00Z"))).toBe("2026-03-29");
    expect(isSendHourInLondon(new Date("2026-03-29T00:30:00Z"), 0)).toBe(true);
    expect(todayInLondon(new Date("2026-03-29T01:30:00Z"))).toBe("2026-03-29");
    expect(isSendHourInLondon(new Date("2026-03-29T01:30:00Z"), 2)).toBe(true);
    expect(todayInLondon(new Date("2026-10-25T00:30:00Z"))).toBe("2026-10-25");
    expect(isSendHourInLondon(new Date("2026-10-25T00:30:00Z"), 1)).toBe(true);
    expect(todayInLondon(new Date("2026-10-25T01:30:00Z"))).toBe("2026-10-25");
    expect(isSendHourInLondon(new Date("2026-10-25T01:30:00Z"), 1)).toBe(true);
    expect(todayInLondon(new Date("2026-06-15T23:30:00Z"))).toBe("2026-06-16");
  });
  it("matches the configured London sending hour in summer and winter", () => {
    expect(isSendHourInLondon(new Date("2026-06-15T07:00:00Z"), 8)).toBe(true);
    expect(isSendHourInLondon(new Date("2026-12-15T08:00:00Z"), 8)).toBe(true);
  });
});
