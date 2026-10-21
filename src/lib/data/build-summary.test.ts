import { describe, expect, it } from "vitest";
import type { CalendarDate, Status } from "@/lib/schedule";
import { formatUkDate } from "@/lib/format/dates";
import { aggregateFarmStatus, buildFarmSummary, formatSizeLabel, type SummaryFarm, type SummaryStage } from "./build-summary";

const today = "2026-10-21" as CalendarDate;
const farm: SummaryFarm = {
  id: "farm-1",
  name: "Obi-Umuagbogho",
  location: "Anambra",
  sizeValue: 2,
  sizeUnit: "hectares",
};

function stage(
  position: number,
  status: Status,
  dueDate: CalendarDate | null,
  isDone = false,
): SummaryStage {
  return {
    position,
    name: `Stage ${position}`,
    isDone,
    status,
    dueDate,
  };
}

function eightStages(
  status: Status,
  dueDate: CalendarDate | null,
  doneThrough = 0,
): SummaryStage[] {
  return Array.from({ length: 8 }, (_, index) => {
    const position = index + 1;
    const isDone = position <= doneThrough;
    return stage(
      position,
      isDone ? "done" : status,
      isDone ? null : dueDate,
      isDone,
    );
  });
}

describe("formatSizeLabel", () => {
  it("formats a size with its unit", () => {
    expect(formatSizeLabel(2, "hectares")).toBe("2 hectares");
    expect(formatSizeLabel(2.5, "acres")).toBe("2.5 acres");
  });

  it("returns null without a complete size", () => {
    expect(formatSizeLabel(null, "hectares")).toBeNull();
    expect(formatSizeLabel(2, null)).toBeNull();
  });
});

describe("aggregateFarmStatus", () => {
  it("uses overdue before due soon and on track", () => {
    expect(
      aggregateFarmStatus([
        stage(1, "on_track", "2027-01-01"),
        stage(2, "due_soon", "2026-10-23"),
        stage(3, "overdue", "2026-10-18"),
      ]),
    ).toBe("overdue");
  });

  it("uses due soon before on track", () => {
    expect(
      aggregateFarmStatus([
        stage(1, "on_track", "2027-01-01"),
        stage(2, "due_soon", "2026-10-23"),
      ]),
    ).toBe("due-soon");
  });

  it("is done only when every stage is done", () => {
    expect(aggregateFarmStatus(eightStages("done", null, 8))).toBe("done");
    expect(aggregateFarmStatus(eightStages("on_track", "2027-01-01", 7))).toBe(
      "on-track",
    );
  });
});

describe("buildFarmSummary", () => {
  it("describes a farm that has not started", () => {
    const summary = buildFarmSummary(
      farm,
      eightStages("on_track", "2027-01-15"),
      today,
    );

    expect(summary).toMatchObject({
      id: "farm-1",
      name: "Obi-Umuagbogho",
      location: "Anambra",
      sizeLabel: "2 hectares",
      status: "on-track",
      doneCount: 0,
      totalStages: 8,
      currentStageName: "Stage 1",
      nextStageName: "Stage 1",
      nextDueDate: "2027-01-15",
      nextDueLabel: formatUkDate("2027-01-15"),
    });
    expect(summary.nextDueDayLabel).toBe("in 86 days");
  });

  it("describes a farm part-way through, with the earliest stage first", () => {
    const stages = eightStages("on_track", "2027-01-15", 3);
    stages[3] = stage(4, "due_soon", "2026-10-23");
    stages[4] = stage(5, "on_track", "2026-11-25");

    const summary = buildFarmSummary(farm, stages, today);

    expect(summary.status).toBe("due-soon");
    expect(summary.doneCount).toBe(3);
    expect(summary.currentStageName).toBe("Stage 4");
    expect(summary.nextStageName).toBe("Stage 4");
    expect(summary.nextDueDate).toBe("2026-10-23");
    expect(summary.nextDueLabel).toBe("Fri 23 Oct 2026");
    expect(summary.nextDueDayLabel).toBe("in 2 days");
  });

  it("describes an overdue farm", () => {
    const stages = eightStages("on_track", "2026-11-25", 1);
    stages[1] = stage(2, "overdue", "2026-10-18");

    const summary = buildFarmSummary(farm, stages, today);

    expect(summary.status).toBe("overdue");
    expect(summary.doneCount).toBe(1);
    expect(summary.currentStageName).toBe("Stage 2");
    expect(summary.nextStageName).toBe("Stage 2");
    expect(summary.nextDueDate).toBe("2026-10-18");
    expect(summary.nextDueDayLabel).toBe("3 days late");
  });

  it("skips unscheduled stages when picking the next job", () => {
    const stages = eightStages("on_track", "2026-11-25", 2);
    stages[2] = stage(3, "unscheduled", null);
    stages[3] = stage(4, "on_track", "2026-11-10");

    const summary = buildFarmSummary(farm, stages, today);

    expect(summary.status).toBe("on-track");
    expect(summary.currentStageName).toBe("Stage 3");
    expect(summary.nextStageName).toBe("Stage 4");
    expect(summary.nextDueDate).toBe("2026-11-10");
  });

  it("has no next job when every stage is done", () => {
    const summary = buildFarmSummary(farm, eightStages("done", null, 8), today);

    expect(summary.status).toBe("done");
    expect(summary.doneCount).toBe(8);
    expect(summary.currentStageName).toBeNull();
    expect(summary.nextStageName).toBeNull();
    expect(summary.nextDueDate).toBeNull();
    expect(summary.nextDueLabel).toBeNull();
    expect(summary.nextDueDayLabel).toBeNull();
  });

  it("handles a farm with no stage rows", () => {
    const summary = buildFarmSummary(farm, [], today);
    expect(summary.status).toBe("on-track");
    expect(summary.doneCount).toBe(0);
    expect(summary.totalStages).toBe(0);
  });
});
