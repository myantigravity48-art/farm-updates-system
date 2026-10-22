import { describe, expect, it } from "vitest";
import { defaultSeasonWindows, type CalendarDate } from "@/lib/schedule";
import {
  buildDashboard,
  type DashboardFarmInput,
  type DashboardRequest,
  type DashboardStageInput,
} from "./build-dashboard";

const today = "2026-10-22" as CalendarDate;
const date = (value: string) => value as CalendarDate;

function stage(
  position: number,
  name: string,
  overrides: Partial<DashboardStageInput> = {},
): DashboardStageInput {
  return {
    position,
    name,
    kind: "date",
    isDone: false,
    doneDate: null,
    dueDate: null,
    windowEnd: null,
    ...overrides,
  };
}

function farm(id: string, name: string, stages: DashboardStageInput[]): DashboardFarmInput {
  return { id, name, stages };
}

function request(farms: DashboardFarmInput[]): DashboardRequest {
  return { farms, headsUpDays: 14, windows: defaultSeasonWindows };
}

describe("buildDashboard with no farms", () => {
  const model = buildDashboard(request([]), today);

  it("reports empty counts and lists", () => {
    expect(model.kpis).toEqual({
      overdue: 0,
      dueSoon: 0,
      doneThisMonth: 0,
      farms: 0,
    });
    expect(model.attention.rows).toEqual([]);
    expect(model.attention.extraCount).toBe(0);
    expect(model.attention.total).toBe(0);
    expect(model.progress.rows).toEqual([]);
    expect(model.progress.total).toBe(0);
    expect(model.comingUp).toEqual([]);
  });

  it("still builds the season timeline", () => {
    expect(model.timeline.segments).toHaveLength(3);
  });
});

describe("buildDashboard KPIs and per-status farms", () => {
  const farms = [
    farm("zeta", "Zeta Fields", [stage(1, "Clearing", { dueDate: "2026-10-16" })]),
    farm("alpha", "Alpha Grove", [stage(1, "First round-weeding", { dueDate: "2026-10-26" })]),
    farm("beta", "Beta Commons", [stage(1, "Land clearing", { dueDate: "2026-10-20" })]),
    farm("delta", "Delta Rise", [stage(1, "Second fertilizer", { dueDate: "2026-12-10" })]),
    farm("echo", "Echo Meadow", [stage(1, "Final stage", { isDone: true, doneDate: null })]),
  ];
  const model = buildDashboard(request(farms), today);

  it("counts overdue, due soon and farms", () => {
    expect(model.kpis).toEqual({
      overdue: 2,
      dueSoon: 1,
      doneThisMonth: 0,
      farms: 5,
    });
  });

  it("puts attention rows overdue first, most late first, then due soon by date", () => {
    expect(model.attention.rows.map((row) => row.farmName)).toEqual([
      "Zeta Fields",
      "Beta Commons",
      "Alpha Grove",
    ]);
    expect(model.attention.rows.map((row) => row.phrase)).toEqual([
      "6 days late",
      "2 days late",
      "Due in 4 days",
    ]);
    expect(model.attention.rows[0]).toMatchObject({
      farmId: "zeta",
      stageName: "Clearing",
      status: "overdue",
    });
    expect(model.attention.rows[2].status).toBe("due-soon");
  });

  it("sorts farm progress by worst status, then name", () => {
    expect(model.progress.rows.map((row) => row.name)).toEqual([
      "Beta Commons",
      "Zeta Fields",
      "Alpha Grove",
      "Delta Rise",
      "Echo Meadow",
    ]);
    expect(model.progress.rows[0]).toMatchObject({
      id: "beta",
      doneCount: 0,
      totalStages: 1,
      status: "overdue",
    });
    expect(model.progress.rows[4].status).toBe("done");
    expect(model.progress.total).toBe(5);
  });
});

describe("buildDashboard doneThisMonth", () => {
  it("counts only done stages in the current London month, never null dates", () => {
    const model = buildDashboard(
      request([
        farm("keeper", "Donekeeper", [
          stage(1, "In this month", { isDone: true, doneDate: "2026-10-05" }),
          stage(2, "Done without a date", { isDone: true, doneDate: null }),
          stage(3, "Done last month", { isDone: true, doneDate: "2026-09-28" }),
          stage(4, "Done last year, same month", { isDone: true, doneDate: "2025-10-20" }),
          stage(5, "Open job", { dueDate: "2026-12-10" }),
        ]),
      ]),
      today,
    );

    expect(model.kpis.doneThisMonth).toBe(1);
  });
});

describe("buildDashboard attention sorting with windows and dates", () => {
  const farms = [
    farm("late-window", "Late Window", [
      stage(1, "Clearing", {
        kind: "window",
        dueDate: "2026-09-01",
        windowEnd: "2026-09-20",
      }),
    ]),
    farm("late-date", "Late Date", [stage(1, "First fertilizer", { dueDate: "2026-09-25" })]),
    farm("late-less", "Late Less", [stage(1, "First round-weeding", { dueDate: "2026-10-08" })]),
    farm("open-window", "Open Window", [
      stage(1, "Planting", {
        kind: "window",
        dueDate: "2026-10-10",
        windowEnd: "2026-11-01",
      }),
    ]),
    farm("soon-date", "Soon Date", [stage(1, "Second weeding", { dueDate: "2026-10-25" })]),
    farm("soon-window", "Soon Window", [
      stage(1, "Second fertilizer", {
        kind: "window",
        dueDate: "2026-10-28",
        windowEnd: "2026-11-30",
      }),
    ]),
  ];
  const model = buildDashboard(request(farms), today);

  it("sorts overdue by days late, including closed windows", () => {
    expect(model.attention.rows.map((row) => row.farmName)).toEqual([
      "Late Window",
      "Late Date",
      "Late Less",
      "Open Window",
      "Soon Date",
      "Soon Window",
    ]);
    expect(model.attention.rows.map((row) => row.phrase)).toEqual([
      "Closed 32 days ago",
      "27 days late",
      "14 days late",
      "Open, closes in 10 days",
      "Due in 3 days",
      "Opens in 6 days",
    ]);
  });

  it("counts every overdue and due-soon stage in the KPIs", () => {
    expect(model.kpis.overdue).toBe(3);
    expect(model.kpis.dueSoon).toBe(3);
  });
});

describe("buildDashboard row caps", () => {
  it("caps attention at 8 rows and reports the remainder", () => {
    const farms = Array.from({ length: 10 }, (_, index) =>
      farm(`farm-${index}`, `Farm ${index}`, [
        stage(1, "Clearing", {
          dueDate: date(`2026-10-${String(index + 1).padStart(2, "0")}`),
        }),
      ]),
    );
    const model = buildDashboard(request(farms), today);

    expect(model.attention.rows).toHaveLength(8);
    expect(model.attention.total).toBe(10);
    expect(model.attention.extraCount).toBe(2);
    expect(model.attention.rows[0].farmName).toBe("Farm 0");
  });
});

describe("buildDashboard comingUp", () => {
  const farms = [
    farm("kappa", "Kappa", [
      stage(1, "Finished job", { isDone: true, doneDate: "2026-10-01" }),
      stage(2, "Overdue job", { dueDate: "2026-10-15" }),
      stage(3, "Soon job", { dueDate: "2026-10-28" }),
      stage(4, "Not scheduled job", { kind: "unscheduled", dueDate: null }),
      stage(5, "Window job", {
        kind: "window",
        dueDate: "2027-01-10",
        windowEnd: "2027-02-20",
      }),
    ]),
    farm("lima", "Lima", [
      stage(5, "Window job", {
        kind: "window",
        dueDate: "2027-01-10",
        windowEnd: "2027-02-20",
      }),
      stage(6, "December job", { dueDate: "2026-12-05" }),
      stage(7, "Late December job", { dueDate: "2026-12-20" }),
      stage(8, "January job", { dueDate: "2027-01-05" }),
      stage(9, "Later January job", { dueDate: "2027-01-15" }),
    ]),
  ];

  const model = buildDashboard(request(farms), today);

  it("lists on-track stages only, sorted by date, capped at 4", () => {
    expect(model.comingUp).toEqual([
      {
        farmId: "lima",
        farmName: "Lima",
        stageName: "December job",
        date: "2026-12-05",
      },
      {
        farmId: "lima",
        farmName: "Lima",
        stageName: "Late December job",
        date: "2026-12-20",
      },
      {
        farmId: "lima",
        farmName: "Lima",
        stageName: "January job",
        date: "2027-01-05",
      },
      {
        farmId: "kappa",
        farmName: "Kappa",
        stageName: "Window job",
        date: "2027-01-10",
      },
    ]);
  });

  it("excludes done, overdue, due-soon and unscheduled stages", () => {
    const stageNames = model.comingUp.map((row) => row.stageName);
    expect(stageNames).not.toContain("Finished job");
    expect(stageNames).not.toContain("Overdue job");
    expect(stageNames).not.toContain("Soon job");
    expect(stageNames).not.toContain("Not scheduled job");
  });
});

describe("buildDashboard progress caps", () => {
  it("caps progress at 8 rows and reports the total", () => {
    const farms = Array.from({ length: 10 }, (_, index) =>
      farm(`farm-${index}`, `Farm ${index}`, [
        stage(1, "Second fertilizer", { dueDate: "2027-02-01" }),
      ]),
    );
    const model = buildDashboard(request(farms), today);

    expect(model.progress.rows).toHaveLength(8);
    expect(model.progress.total).toBe(10);
    expect(model.progress.rows.map((row) => row.name)).toEqual([
      "Farm 0",
      "Farm 1",
      "Farm 2",
      "Farm 3",
      "Farm 4",
      "Farm 5",
      "Farm 6",
      "Farm 7",
    ]);
  });
});
