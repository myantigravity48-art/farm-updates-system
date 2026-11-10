import { describe, expect, it } from "vitest";
import type { CalendarDate, StageTemplate } from "@/lib/schedule";
import { formatUkDate } from "@/lib/format/dates";
import {
  buildStageRows,
  stageRuleText,
  STATUS_LABELS,
  type StageRowInput,
} from "./build-stage-rows";

const today = "2026-10-21" as CalendarDate;
const headsUpDays = 14;

const clearing: StageTemplate = {
  position: 1,
  name: "Land clearing",
  triggerType: "season_window",
  windowKey: "dry_season",
};
const planting: StageTemplate = {
  position: 3,
  name: "Planting",
  triggerType: "season_window",
  windowKey: "planting",
};

const orderSeedlings: StageTemplate = { position: 2, name: "Order seedlings", triggerType: "after_stage_done", anchorWindowKey: "dry_season", offsetDays: 0 };
const afterTemplates: StageTemplate[] = [
  { position: 4, name: "First round-weeding", triggerType: "after_planting", offsetMonths: 3 },
  { position: 5, name: "Herbicide", triggerType: "after_planting", offsetMonths: 3 },
  { position: 6, name: "First fertilizer", triggerType: "after_planting", offsetMonths: 4 },
  { position: 7, name: "Second round-weeding", triggerType: "after_planting", offsetMonths: 7 },
  { position: 8, name: "Third round-weeding", triggerType: "after_planting", offsetMonths: 11 },
  { position: 9, name: "Second fertilizer", triggerType: "after_planting", offsetMonths: 12 },
];

function done(
  template: StageTemplate,
  doneDate: CalendarDate | null,
): StageRowInput {
  return {
    template,
    scheduled: {
      position: template.position,
      name: template.name,
      kind: "date",
      dueDate: "2026-01-01",
      isDone: true,
      doneDate,
    },
    dueDateOverride: null,
  };
}

function windowRow(
  template: StageTemplate,
  start: CalendarDate,
  end: CalendarDate,
  isDone = false,
  dueDateOverride: CalendarDate | null = null,
): StageRowInput {
  return {
    template,
    scheduled: {
      position: template.position,
      name: template.name,
      kind: "window",
      windowStart: start,
      windowEnd: end,
      isDone,
      doneDate: null,
    },
    dueDateOverride,
  };
}

function dateRow(
  template: StageTemplate,
  dueDate: CalendarDate,
  dueDateOverride: CalendarDate | null = null,
): StageRowInput {
  return {
    template,
    scheduled: {
      position: template.position,
      name: template.name,
      kind: "date",
      dueDate,
      isDone: false,
      doneDate: null,
    },
    dueDateOverride,
  };
}

function unscheduledRow(template: StageTemplate): StageRowInput {
  return {
    template,
    scheduled: {
      position: template.position,
      name: template.name,
      kind: "unscheduled",
      isDone: false,
      doneDate: null,
    },
    dueDateOverride: null,
  };
}

function dateRowsWithPlanting(dueDates: CalendarDate[]): StageRowInput[] {
  return afterTemplates.map((template, index) => dateRow(template, dueDates[index]));
}

describe("stageRuleText", () => {
  it("reads season-window rules from the template", () => {
    expect(stageRuleText(clearing)).toBe("Dry season window");
    expect(stageRuleText(planting)).toBe("Planting window");
  });

  it("reads after-planting offsets from the template, singular and plural", () => {
    expect(stageRuleText(afterTemplates[0])).toBe("3 months after planting");
    expect(stageRuleText({ ...afterTemplates[0], offsetMonths: 1 })).toBe("1 month after planting");
  });
  it("uses the after-stage-done anchor wording", () => {
    expect(stageRuleText(orderSeedlings, "Land clearing")).toBe("Starts when Land clearing is marked done");
    const scheduled = { template: orderSeedlings, scheduled: { position: 2, name: "Order seedlings", kind: "date" as const, dueDate: "2026-10-21" as CalendarDate, isDone: false, doneDate: null, waitingForStage: "Land clearing" }, dueDateOverride: null };
    expect(buildStageRows([scheduled], today, headsUpDays)[0].dateText).toContain(`Due ${formatUkDate("2026-10-21")} · Set from Land clearing done date`);
  });
});

describe("buildStageRows", () => {
  it("marks the first stage as next up when nothing is done", () => {
    const rows = buildStageRows(
      [
        windowRow(clearing, "2026-11-01", "2027-03-31"),
        { template: orderSeedlings, scheduled: { position: 2, name: "Order seedlings", kind: "unscheduled", isDone: false, doneDate: null, unscheduledReason: "needs_anchor_stage", waitingForStage: "Land clearing" }, dueDateOverride: null },
        windowRow(planting, "2027-04-25", "2027-07-15"),
        unscheduledRow(afterTemplates[0]),
      ],
      today,
      headsUpDays,
    );

    expect(rows.map((row) => row.position)).toEqual([1, 2, 3, 4]);
    expect(rows[0]).toMatchObject({
      name: "Land clearing",
      ruleText: "Dry season window",
      state: "due_soon",
      pillLabel: "Due soon",
      nextUp: true,
    });
    expect(rows[1]).toMatchObject({ ruleText: "Starts when Land clearing is marked done", dateText: "Starts when Land clearing is marked done", nextUp: false });
    expect(rows[2].ruleText).toBe("Planting window");
    expect(rows[3]).toMatchObject({
      state: "unscheduled",
      pillLabel: "Unscheduled",
      dateText: "Date set once planting is done",
      nextUp: false,
    });
  });

  it("describes done stages with and without a date", () => {
    const rows = buildStageRows(
      [
        done(clearing, "2026-04-12"),
        done(planting, null),
        dateRow(afterTemplates[0], "2026-08-02"),
      ],
      today,
      headsUpDays,
    );

    expect(rows[0].state).toBe("done");
    expect(rows[0].dateText).toBe(`Done ${formatUkDate("2026-04-12")}`);
    expect(rows[1].dateText).toBe("Done, date not recorded");
    expect(rows[2].nextUp).toBe(true);
  });

  it("schedules after-planting stages when a planting date exists", () => {
    const rows = buildStageRows(
      [windowRow(clearing, "2026-04-12", "2027-03-31", true), ...dateRowsWithPlanting([
        "2026-08-02",
        "2026-08-02",
        "2026-09-02",
        "2026-12-02",
        "2027-04-02",
        "2027-05-02",
      ])],
      today,
      headsUpDays,
    );

    expect(rows[1].dateText).toContain(`Due ${formatUkDate("2026-08-02")}`);
    expect(rows[1].dateText).toContain("days late");
    expect(rows.every((row) => row.state !== "unscheduled")).toBe(true);
  });

  it("shows unscheduled rows when the farm has no planting date", () => {
    const rows = buildStageRows(
      afterTemplates.map((template) => unscheduledRow(template)),
      today,
      headsUpDays,
    );

    for (const row of rows) {
      expect(row.state).toBe("unscheduled");
      expect(row.dateText).toBe("Date set once planting is done");
      expect(row.pillLabel).toBe("Unscheduled");
    }
    expect(rows[0].nextUp).toBe(true);
    expect(rows[1].nextUp).toBe(false);
  });

  it("marks an overdue stage and keeps the day phrase", () => {
    const rows = buildStageRows(
      [dateRow(afterTemplates[0], "2026-10-18")],
      today,
      headsUpDays,
    );

    expect(rows[0]).toMatchObject({ state: "overdue", pillLabel: "Overdue" });
    expect(rows[0].dateText).toBe(`Due ${formatUkDate("2026-10-18")} · 3 days late`);
  });

  it("adds Date set manually when a stage has an override", () => {
    const rows = buildStageRows(
      [dateRow(afterTemplates[0], "2027-02-01", "2027-02-01")],
      today,
      headsUpDays,
    );

    expect(rows[0].dateText).toBe(`Due ${formatUkDate("2027-02-01")} · Due in 103 days · Date set manually`);
  });

  it("describes a window that is open now", () => {
    const rows = buildStageRows(
      [windowRow(clearing, "2026-09-01", "2026-12-31")],
      today,
      headsUpDays,
    );

    expect(rows[0].state).toBe("due_soon");
    expect(rows[0].dateText).toBe(
      `Opens ${formatUkDate("2026-09-01")}, closes ${formatUkDate("2026-12-31")} · Open, closes in 71 days`,
    );
  });

  it("has no next up row when every stage is done", () => {
    const rows = buildStageRows(
      [
        done(clearing, "2026-04-12"),
        done(orderSeedlings, "2026-04-12"),
        done(planting, "2026-05-15"),
        ...afterTemplates.map((template) => done(template, "2026-10-02")),
      ],
      today,
      headsUpDays,
    );

    expect(rows).toHaveLength(9);
    expect(rows.every((row) => row.state === "done")).toBe(true);
    expect(rows.some((row) => row.nextUp)).toBe(false);
  });

  it("orders rows by position even when the input is unsorted", () => {
    const rows = buildStageRows(
      [dateRow(afterTemplates[0], "2026-08-02"), windowRow(clearing, "2026-11-01", "2027-03-31")],
      today,
      headsUpDays,
    );

    expect(rows.map((row) => row.position)).toEqual([1, 4]);
  });

  it("has a status label for every engine state", () => {
    expect(STATUS_LABELS).toEqual({
      done: "Done",
      unscheduled: "Unscheduled",
      on_track: "On track",
      due_soon: "Due soon",
      overdue: "Overdue",
    });
  });
});
