import { describe, expect, it } from "vitest";

import {
  addMonths,
  computeSchedule,
  defaultStageTemplates,
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
  { position: 2, name: "Order seedlings", triggerType: "after_stage_done", anchorWindowKey: "dry_season", offsetDays: 0 },
  { position: 3, name: "Planting", triggerType: "season_window", windowKey: "planting" },
  { position: 4, name: "Weeding", triggerType: "after_planting", offsetMonths: 3 },
  { position: 5, name: "Herbicide", triggerType: "after_planting", offsetMonths: 3 },
  { position: 6, name: "Fertilizer", triggerType: "after_planting", offsetMonths: 4 },
  { position: 7, name: "Second weeding", triggerType: "after_planting", offsetMonths: 7 },
  { position: 8, name: "Third weeding", triggerType: "after_planting", offsetMonths: 11 },
  { position: 9, name: "Second fertilizer", triggerType: "after_planting", offsetMonths: 12 },
];
const farm = (plantingDate: FarmInput["plantingDate"] = null): FarmInput => ({ anchorDate: "2026-10-12", plantingDate });
const states = (overrides: Partial<StageState>[] = []): StageState[] => templates.map((template, index) => ({ position: template.position, isDone: false, doneDate: null, dueDateOverride: null, ...overrides[index] }));
const settings: AlertSettings = { headsUpDays: 14, reminderDays: 3, overdueEnabled: true, overdueRepeatDays: 7, windowNudgeDays: 14 };

describe("date arithmetic", () => {
  it("seeds the nine lifecycle stages in order", () => {
    expect(defaultStageTemplates).toHaveLength(9);
    expect(defaultStageTemplates.map((stage) => stage.name)).toEqual([
      "Land clearing", "Order seedlings", "Planting", "First round-weeding", "Herbicide",
      "First fertilizer", "Second round-weeding", "Third round-weeding", "Second fertilizer",
    ]);
    expect(defaultStageTemplates[1]).toMatchObject({ triggerType: "after_stage_done", anchorWindowKey: "dry_season", offsetDays: 0 });
  });

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
    expect(schedule[2]).toMatchObject({ windowStart: "2027-04-25", windowEnd: "2027-07-15" });
    const planted = computeSchedule(templates, [drySeason, plantingWindow], farm("2027-05-10"), states());
    expect(planted[3].dueDate).toBe("2027-08-10");
    expect(planted[8].dueDate).toBe("2028-05-10");
  });

  it("clamps long offsets and derives planting date from completed planting", () => {
    expect(computeSchedule(templates, [drySeason, plantingWindow], farm("2027-05-31"), states())[7].dueDate).toBe("2028-04-30");
    expect(computeSchedule(templates, [drySeason, plantingWindow], farm(), states([{},{},{ isDone: true, doneDate: "2027-05-10" }]))[3].dueDate).toBe("2027-08-10");
  });

  it("recomputes planting schedules, applies overrides, and leaves missing planting unscheduled", () => {
    expect(computeSchedule(templates, [drySeason, plantingWindow], farm("2027-05-11"), states())[3].dueDate).toBe("2027-08-11");
    expect(computeSchedule(templates, [drySeason, plantingWindow], farm("2027-06-11"), states())[3].dueDate).toBe("2027-09-11");
    expect(computeSchedule(templates, [drySeason, plantingWindow], farm("2027-05-10"), states([{},{},{},{ dueDateOverride: "2027-08-19" }]))[3]).toMatchObject({ kind: "date", dueDate: "2027-08-19" });
    expect(computeSchedule(templates, [drySeason, plantingWindow], farm(), states())[3].kind).toBe("unscheduled");
  });

  it("does not roll a missed window forward and retains done stages without dates", () => {
    const schedule = computeSchedule(templates, [drySeason, plantingWindow], { anchorDate: "2026-12-01", plantingDate: null }, states([{ isDone: true }]));
    expect(schedule[0]).toMatchObject({ windowStart: "2026-11-01", windowEnd: "2027-03-31", isDone: true, doneDate: null });
    expect(getStatus(schedule[0], "2027-04-02", 14)).toBe("done");
    const notDone = computeSchedule(templates, [drySeason, plantingWindow], { anchorDate: "2026-12-01", plantingDate: null }, states());
    expect(getStatus(notDone[0], "2027-04-02", 14)).toBe("overdue");
  });

  it("schedules after-stage work from the keyed anchor and preserves planting anchoring", () => {
    const unscheduled = computeSchedule(templates, [drySeason, plantingWindow], farm(), states());
    expect(unscheduled[1]).toMatchObject({ kind: "unscheduled", unscheduledReason: "needs_anchor_stage", waitingForStage: "Clearing" });
    const clearDone = states([{ isDone: true, doneDate: "2028-02-28" }]);
    expect(computeSchedule(templates, [drySeason, plantingWindow], farm(), clearDone)[1].dueDate).toBe("2028-02-28");
    const completedOrder = states([{ isDone: true, doneDate: "2028-02-28" }, { isDone: true, doneDate: "2028-03-20" }]);
    expect(computeSchedule(templates, [drySeason, plantingWindow], farm(), completedOrder)[1]).toMatchObject({ kind: "date", dueDate: "2028-02-28", isDone: true });
    const leapDone = states([{ isDone: true, doneDate: "2028-02-29" }]);
    expect(computeSchedule(templates, [drySeason, plantingWindow], farm(), leapDone)[1].dueDate).toBe("2028-02-29");
    const offset = templates.map((item) => item.position === 2 ? { ...item, offsetDays: 1 } : item);
    expect(computeSchedule(offset, [drySeason, plantingWindow], farm(), clearDone)[1].dueDate).toBe("2028-02-29");
    expect(computeSchedule(offset, [drySeason, plantingWindow], farm(), states([{ isDone: true, doneDate: "2028-02-29" }]))[1].dueDate).toBe("2028-03-01");
    const anchorDoneWithoutDate = states([{ isDone: true, doneDate: null }]);
    expect(computeSchedule(templates, [drySeason, plantingWindow], farm(), anchorDoneWithoutDate)[1]).toMatchObject({ kind: "unscheduled", unscheduledReason: "needs_anchor_stage" });
    expect(computeSchedule(templates, [drySeason, plantingWindow], farm(), states([{},{ dueDateOverride: "2027-01-01" }]))[1]).toMatchObject({ kind: "date", dueDate: "2027-01-01" });
    expect(computeSchedule(templates, [drySeason, plantingWindow], farm(), states([{},{},{},{},{},{},{},{},{ dueDateOverride: "2027-01-01" }]))[8]).toMatchObject({ kind: "date", dueDate: "2027-01-01" });
    const plantingAnchored = computeSchedule(templates, [drySeason, plantingWindow], farm(), states([{ isDone: true, doneDate: "2027-01-20" }]));
    expect(plantingAnchored[2]).toMatchObject({ windowStart: "2027-04-25", windowEnd: "2027-07-15" });
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
    expect(types("2027-06-23")[0].occurrenceKey).toBe("1:overdue:2027-06-15:1");
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

  it("sends weekly reminders after clearing and repeats overdue weekly", () => {
    const completedClearing = computeSchedule(templates, [drySeason, plantingWindow], farm(), states([{ isDone: true, doneDate: "2027-03-01" }]));
    const seedling = completedClearing[1];
    expect(getDueAlerts([seedling], "2027-03-01", settings, new Set())).toContainEqual({ position: 2, type: "reminder", occurrenceKey: "2:reminder:2027-03-01" });
    expect(getDueAlerts([seedling], "2027-03-02", settings, new Set())[0].occurrenceKey).toBe("2:overdue:2027-03-01:0");
    expect(getDueAlerts([seedling], "2027-03-09", settings, new Set())[0].occurrenceKey).toBe("2:overdue:2027-03-01:1");
  });

  it("nudges during open windows at spaced intervals, respecting earlier stages", () => {
    const first: ScheduledStage = { position: 1, name: "Clearing", kind: "window", windowStart: "2027-06-01", windowEnd: "2027-06-30", isDone: false, doneDate: null };
    const planting: ScheduledStage = { position: 3, name: "Planting", kind: "window", windowStart: "2027-06-01", windowEnd: "2027-06-30", isDone: false, doneDate: null };
    const order: ScheduledStage = { position: 2, name: "Order seedlings", kind: "date", dueDate: "2027-06-01", isDone: false, doneDate: null };
    const day = (date: CalendarDate, value = settings, rows = [first]) => getDueAlerts(rows, date, value, new Set()).filter((alert) => alert.type === "window_open");
    expect(day("2027-06-14")).toEqual([]);
    expect(day("2027-06-15")[0]).toMatchObject({ occurrenceKey: "1:window_open:2027-06-01:1", days: 15 });
    expect(day("2027-06-28")[0].occurrenceKey).toBe("1:window_open:2027-06-01:1");
    expect(day("2027-06-29")[0].occurrenceKey).toBe("1:window_open:2027-06-01:2");
    expect(day("2027-07-01")).toEqual([]);
    expect(day("2027-06-15", { ...settings, windowNudgeDays: 0 })).toEqual([]);
    expect(day("2027-06-15", settings, [{ ...first, isDone: true }])).toEqual([]);
    expect(day("2027-06-15", settings, [planting, { ...order, isDone: false }])).toEqual([]);
    expect(day("2027-06-15", settings, [planting, { ...order, isDone: true }])[0].type).toBe("window_open");
    expect(getDueAlerts([first], "2027-06-15", settings, new Set(["1:window_open:2027-06-01:1"]))).toEqual([]);
    expect(day("2027-06-17")[0].occurrenceKey).toBe("1:window_open:2027-06-01:1");
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
