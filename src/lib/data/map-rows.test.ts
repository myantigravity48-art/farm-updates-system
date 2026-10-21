import { describe, expect, it } from "vitest";
import { computeSchedule } from "@/lib/schedule";
import type { Database } from "@/lib/supabase/database.types";
import { mapFarmInput, mapStageStates, mapTemplates, mapWindows, toEngineInputs } from "./map-rows";

type TemplateRow = Database["public"]["Tables"]["stage_templates"]["Row"];
type WindowRow = Database["public"]["Tables"]["season_windows"]["Row"];
type FarmRow = Database["public"]["Tables"]["farms"]["Row"];
type FarmStageRow = Database["public"]["Tables"]["farm_stages"]["Row"];

function templateRow(overrides: Partial<TemplateRow> & Pick<TemplateRow, "id" | "position">): TemplateRow {
  return {
    name: `Stage ${overrides.position}`,
    trigger_type: "after_planting",
    offset_months: 3,
    window_key: null,
    ...overrides,
  };
}

function farmRow(overrides: Partial<FarmRow> = {}): FarmRow {
  return {
    id: "farm-1",
    name: "Farm A",
    location: "Village",
    size_value: 2,
    size_unit: "hectares",
    planting_date: null,
    schedule_anchor_date: "2026-01-15",
    notes: null,
    created_at: "2026-01-15T08:00:00Z",
    created_by: null,
    ...overrides,
  };
}

function stageRow(overrides: Partial<FarmStageRow> & Pick<FarmStageRow, "template_id">): FarmStageRow {
  return {
    id: `stage-${overrides.template_id}`,
    farm_id: "farm-1",
    is_done: false,
    done_date: null,
    done_by: null,
    done_note: null,
    due_date_override: null,
    ...overrides,
  };
}

const dryWindow: WindowRow = {
  key: "dry_season",
  start_month: 11,
  start_day: 1,
  end_month: 3,
  end_day: 31,
};

const plantingWindow: WindowRow = {
  key: "planting",
  start_month: 4,
  start_day: 25,
  end_month: 7,
  end_day: 15,
};

describe("row-to-engine mapper", () => {
  it("maps templates in position order", () => {
    const templates = mapTemplates([
      templateRow({ id: "t3", position: 3, offset_months: 3, name: "First weeding" }),
      templateRow({
        id: "t1",
        position: 1,
        trigger_type: "season_window",
        offset_months: null,
        window_key: "dry_season",
      }),
    ]);

    expect(templates.map((template) => template.position)).toEqual([1, 3]);
    expect(templates[0]).toMatchObject({
      triggerType: "season_window",
      windowKey: "dry_season",
      offsetMonths: undefined,
    });
    expect(templates[1]).toMatchObject({
      triggerType: "after_planting",
      windowKey: undefined,
      offsetMonths: 3,
    });
  });

  it("maps season windows", () => {
    expect(mapWindows([dryWindow])).toEqual([
      { key: "dry_season", startMonth: 11, startDay: 1, endMonth: 3, endDay: 31 },
    ]);
  });

  it("maps farm dates", () => {
    expect(mapFarmInput(farmRow({ planting_date: "2026-05-01" }))).toEqual({
      plantingDate: "2026-05-01",
      anchorDate: "2026-01-15",
    });
    expect(mapFarmInput(farmRow()).plantingDate).toBeNull();
  });

  it("maps stage rows by template id and skips unknown templates", () => {
    const rows = [
      stageRow({
        template_id: "t1",
        is_done: true,
        done_date: "2026-01-20",
        done_note: "Marked done",
      }),
      stageRow({ template_id: "t2", due_date_override: "2026-09-01" }),
      stageRow({ template_id: "missing" }),
    ];

    const states = mapStageStates(rows, [
      templateRow({ id: "t1", position: 1 }),
      templateRow({ id: "t2", position: 2 }),
    ]);

    expect(states).toHaveLength(2);
    expect(states[0]).toEqual({
      position: 1,
      isDone: true,
      doneDate: "2026-01-20",
      dueDateOverride: null,
    });
    expect(states[1]).toEqual({
      position: 2,
      isDone: false,
      doneDate: null,
      dueDateOverride: "2026-09-01",
    });
  });

  it("produces engine inputs with scheduled and unscheduled after-planting stages", () => {
    const templateRows = [
      templateRow({
        id: "t1",
        position: 1,
        name: "Land clearing",
        trigger_type: "season_window",
        offset_months: null,
        window_key: "dry_season",
      }),
      templateRow({
        id: "t2",
        position: 2,
        name: "Planting",
        trigger_type: "season_window",
        offset_months: null,
        window_key: "planting",
      }),
      templateRow({ id: "t3", position: 3, name: "First weeding", offset_months: 3 }),
    ];
    const windowRows = [dryWindow, plantingWindow];

    const withPlanting = toEngineInputs({
      templateRows,
      windowRows,
      farmRow: farmRow({ planting_date: "2026-05-01" }),
      stageRows: [],
    });

    expect(computeSchedule(withPlanting.templates, withPlanting.windows, withPlanting.farm, withPlanting.stages)).toMatchObject([
      { position: 1, kind: "window" },
      { position: 2, kind: "window" },
      { position: 3, kind: "date", dueDate: "2026-08-01" },
    ]);

    const withoutPlanting = toEngineInputs({
      templateRows,
      windowRows,
      farmRow: farmRow(),
      stageRows: [],
    });

    expect(computeSchedule(withoutPlanting.templates, withoutPlanting.windows, withoutPlanting.farm, withoutPlanting.stages)).toMatchObject([
      { position: 1, kind: "window" },
      { position: 2, kind: "window" },
      { position: 3, kind: "unscheduled" },
    ]);
  });
});
