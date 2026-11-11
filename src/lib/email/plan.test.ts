import { describe, expect, it } from "vitest";
import type { CalendarDate, SeasonWindow, StageTemplate } from "@/lib/schedule";
import { defaultAlertSettings, defaultStageTemplates } from "@/lib/schedule";
import { planDailyAlerts, type DailyAlertPlanInput, type PlannerFarm } from "./plan";

const dateTemplate: StageTemplate[] = [{ position: 1, name: "First fertilizer", triggerType: "after_planting", offsetMonths: 1 }];
const dateSettings = { ...defaultAlertSettings, windowNudgeDays: 0 };

function makeFarm(
  id: string,
  name: string,
  stages: Array<Partial<PlannerFarm["stages"][number]> & { position: number }> = [{ position: 1 }],
  plantingDate: CalendarDate | null = "2027-06-01",
  anchorDate: CalendarDate = "2027-06-17",
): PlannerFarm {
  return {
    id,
    name,
    plantingDate,
    anchorDate,
    stages: stages.map((stage) => ({
      ...stage,
      farmStageId: stage.farmStageId ?? `${id}-stage-${stage.position}`,
      position: stage.position,
      isDone: stage.isDone ?? false,
      doneDate: stage.doneDate ?? null,
      dueDateOverride: stage.dueDateOverride ?? null,
    })),
  };
}

function input(overrides: Partial<DailyAlertPlanInput> = {}): DailyAlertPlanInput {
  return {
    today: "2027-06-17",
    farms: [makeFarm("farm-a", "Iyanuole")],
    templates: dateTemplate,
    windows: [],
    settings: dateSettings,
    recipients: [{ id: "recipient-a", name: "Ada", enabled: true }],
    sent: [],
    ...overrides,
  };
}

const windowTemplate: StageTemplate[] = [{ position: 1, name: "Land clearing", triggerType: "season_window", windowKey: "dry_season" }];
const marchWindow: SeasonWindow = { key: "dry_season", startMonth: 3, startDay: 1, endMonth: 3, endDay: 31 };

function windowInput(overrides: Partial<DailyAlertPlanInput> = {}): DailyAlertPlanInput {
  return input({
    today: "2027-03-15",
    farms: [makeFarm("farm-window", "Iyanuole", [{ position: 1 }], null, "2027-03-01")],
    templates: windowTemplate,
    windows: [marchWindow],
    settings: { ...defaultAlertSettings, windowNudgeDays: 14 },
    ...overrides,
  });
}

describe("planDailyAlerts", () => {
  it("returns no recipient entries when there are no recipients", () => {
    expect(planDailyAlerts(input({ recipients: [] }))).toEqual([]);
  });

  it("excludes disabled recipients", () => {
    expect(planDailyAlerts(input({ recipients: [{ id: "off", name: "Ada", enabled: false }] }))).toEqual([]);
  });

  it("returns one recipient with a heads-up and its logging key", () => {
    const planned = planDailyAlerts(input())[0];
    expect(planned.recipientId).toBe("recipient-a");
    expect(planned.items).toHaveLength(1);
    expect(planned.entries).toEqual([{ item: planned.items[0], key: planned.keys[0] }]);
    expect(planned.items[0]).toMatchObject({ type: "heads_up", farmId: "farm-a", farmName: "Iyanuole", stageName: "First fertilizer", kind: "date", date: "2027-07-01", days: 14 });
    expect(planned.keys).toEqual([{ farmStageId: "farm-a-stage-1", alertType: "heads_up", occurrenceKey: "1:heads_up:2027-07-01" }]);
  });

  it("suppresses a sent occurrence only for the matching recipient", () => {
    const planned = planDailyAlerts(input({
      recipients: [
        { id: "recipient-a", name: "Ada", enabled: true },
        { id: "recipient-b", name: "Bola", enabled: true },
      ],
      sent: [{ recipientId: "recipient-a", farmStageId: "farm-a-stage-1", alertType: "heads_up", occurrenceKey: "1:heads_up:2027-07-01" }],
    }));
    expect(planned).toEqual([{ recipientId: "recipient-b", items: [expect.objectContaining({ type: "heads_up" })], keys: [expect.objectContaining({ farmStageId: "farm-a-stage-1" })], entries: [{ item: expect.objectContaining({ type: "heads_up" }), key: expect.objectContaining({ farmStageId: "farm-a-stage-1" }) }] }]);
  });

  it("uses different sent sets for recipients independently", () => {
    const planned = planDailyAlerts(input({
      recipients: [
        { id: "recipient-a", name: "Ada", enabled: true },
        { id: "recipient-b", name: "Bola", enabled: true },
      ],
      sent: [{ recipientId: "recipient-b", farmStageId: "farm-a-stage-1", alertType: "heads_up", occurrenceKey: "1:heads_up:2027-07-01" }],
    }));
    expect(planned.map((entry) => entry.recipientId)).toEqual(["recipient-a"]);
  });

  it("changes the overdue occurrence key after overdueRepeatDays", () => {
    const overdueTemplate: StageTemplate[] = [{ position: 1, name: "First fertilizer", triggerType: "after_planting", offsetMonths: 0 }];
    const farm = makeFarm("farm-a", "Iyanuole", [{ position: 1 }], "2027-06-01");
    const common = { farms: [farm], templates: overdueTemplate, settings: { ...dateSettings, overdueRepeatDays: 7, overdueEnabled: true } };
    const first = planDailyAlerts(input({ ...common, today: "2027-06-02" }))[0];
    const repeated = planDailyAlerts(input({ ...common, today: "2027-06-09" }))[0];
    expect(first.keys[0].occurrenceKey).toBe("1:overdue:2027-06-01:0");
    expect(repeated.keys[0].occurrenceKey).toBe("1:overdue:2027-06-01:1");
    expect(first.items[0].days).toBe(1);
    expect(repeated.items[0].days).toBe(8);
  });

  it("adds window-open alerts on engine nudge days with days left and stops when disabled", () => {
    const planned = planDailyAlerts(windowInput())[0];
    expect(planned.items[0]).toMatchObject({ type: "window_open", kind: "window", date: "2027-03-01", windowEnd: "2027-03-31", days: 16 });
    expect(planned.keys[0].occurrenceKey).toBe("1:window_open:2027-03-01:1");
    expect(planDailyAlerts(windowInput({ settings: { ...defaultAlertSettings, windowNudgeDays: 0 } }))).toEqual([]);
  });

  it("catches up to the current nudge occurrence after a missed day", () => {
    const planned = planDailyAlerts(windowInput({
      today: "2027-03-29",
      sent: [{ recipientId: "recipient-a", farmStageId: "farm-window-stage-1", alertType: "window_open", occurrenceKey: "1:window_open:2027-03-01:1" }],
    }))[0];
    expect(planned.keys[0].occurrenceKey).toBe("1:window_open:2027-03-01:2");
    expect(planned.items[0].days).toBe(2);
  });

  it("produces nothing for done and unscheduled stages", () => {
    const templates: StageTemplate[] = [
      { position: 1, name: "First fertilizer", triggerType: "after_planting", offsetMonths: 1 },
      { position: 2, name: "Order seedlings", triggerType: "after_stage_done", anchorWindowKey: "dry_season", offsetDays: 0 },
    ];
    const farm = makeFarm("farm-a", "Iyanuole", [{ position: 1, isDone: true, doneDate: "2027-06-01" }, { position: 2 }]);
    expect(planDailyAlerts(input({ farms: [farm], templates }))).toEqual([]);
  });

  it("includes Order seedlings only once the clearing stage is done", () => {
    const farm = makeFarm("farm-a", "Iyanuole", defaultStageTemplates.map((template) => ({ position: template.position })), null, "2027-03-01");
    const common = { today: "2027-03-01" as CalendarDate, farms: [farm], templates: defaultStageTemplates, windows: [marchWindow, { key: "planting" as const, startMonth: 4, startDay: 1, endMonth: 7, endDay: 15 }], settings: { ...defaultAlertSettings, windowNudgeDays: 0 } };
    expect(planDailyAlerts(input(common))[0].items.some((item) => item.stageName === "Order seedlings")).toBe(false);

    const cleared = { ...farm, stages: farm.stages.map((stage) => stage.position === 1 ? { ...stage, isDone: true, doneDate: "2027-03-01" as CalendarDate } : stage) };
    const seedlingsPlan = planDailyAlerts(input({ ...common, farms: [cleared] }))[0];
    expect(seedlingsPlan.items.some((item) => item.stageName === "Order seedlings")).toBe(true);
  });

  it("sorts by farm name and then stage position", () => {
    const templates: StageTemplate[] = [
      { position: 1, name: "First stage", triggerType: "after_planting", offsetMonths: 1 },
      { position: 2, name: "Second stage", triggerType: "after_planting", offsetMonths: 1 },
    ];
    const farms = [
      makeFarm("farm-z", "Zeta", [{ position: 1 }, { position: 2 }]),
      makeFarm("farm-a", "Alpha", [{ position: 1 }, { position: 2 }]),
    ];
    const planned = planDailyAlerts(input({ farms, templates }))[0];
    expect(planned.items.map((item) => `${item.farmName}:${item.stageName}`)).toEqual([
      "Alpha:First stage", "Alpha:Second stage", "Zeta:First stage", "Zeta:Second stage",
    ]);
    expect(planned.keys.map((key) => key.farmStageId)).toEqual([
      "farm-a-stage-1", "farm-a-stage-2", "farm-z-stage-1", "farm-z-stage-2",
    ]);
  });
});
