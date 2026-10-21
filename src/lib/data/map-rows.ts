import type { CalendarDate, FarmInput, SeasonWindow, StageState, StageTemplate } from "@/lib/schedule";
import type { Database } from "@/lib/supabase/database.types";

type TemplateRow = Database["public"]["Tables"]["stage_templates"]["Row"];
type WindowRow = Database["public"]["Tables"]["season_windows"]["Row"];
type FarmRow = Database["public"]["Tables"]["farms"]["Row"];
type FarmStageRow = Database["public"]["Tables"]["farm_stages"]["Row"];

export interface EngineInputs {
  templates: StageTemplate[];
  windows: SeasonWindow[];
  farm: FarmInput;
  stages: StageState[];
}

export function mapTemplates(rows: TemplateRow[]): StageTemplate[] {
  return [...rows]
    .sort((left, right) => left.position - right.position)
    .map((row) => ({
      position: row.position,
      name: row.name,
      triggerType: row.trigger_type,
      windowKey:
        row.window_key === "dry_season" || row.window_key === "planting"
          ? row.window_key
          : undefined,
      offsetMonths: row.offset_months ?? undefined,
    }));
}

export function mapWindows(rows: WindowRow[]): SeasonWindow[] {
  return rows.map((row) => ({
    key: row.key,
    startMonth: row.start_month,
    startDay: row.start_day,
    endMonth: row.end_month,
    endDay: row.end_day,
  }));
}

export function mapFarmInput(row: FarmRow): FarmInput {
  return {
    plantingDate: (row.planting_date as CalendarDate | null) ?? null,
    anchorDate: row.schedule_anchor_date as CalendarDate,
  };
}

export function mapStageStates(rows: FarmStageRow[], templateRows: TemplateRow[]): StageState[] {
  const positionByTemplateId = new Map(
    templateRows.map((row) => [row.id, row.position] as const),
  );

  return rows.flatMap((row) => {
    const position = positionByTemplateId.get(row.template_id);
    if (position === undefined) return [];

    return [
      {
        position,
        isDone: row.is_done,
        doneDate: (row.done_date as CalendarDate | null) ?? null,
        dueDateOverride: (row.due_date_override as CalendarDate | null) ?? null,
      },
    ];
  });
}

export function toEngineInputs(input: {
  templateRows: TemplateRow[];
  windowRows: WindowRow[];
  farmRow: FarmRow;
  stageRows: FarmStageRow[];
}): EngineInputs {
  return {
    templates: mapTemplates(input.templateRows),
    windows: mapWindows(input.windowRows),
    farm: mapFarmInput(input.farmRow),
    stages: mapStageStates(input.stageRows, input.templateRows),
  };
}
