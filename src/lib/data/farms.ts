import { notFound } from "next/navigation";
import {
  computeSchedule,
  defaultAlertSettings,
  getStatus,
  todayInLondon,
  type CalendarDate,
  type ScheduledStage,
} from "@/lib/schedule";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { buildFarmSummary, type SummaryStage } from "./build-summary";
import { mapFarmInput, mapStageStates, mapTemplates, mapWindows } from "./map-rows";
import type { FarmDetail, FarmSummary, StageConfig } from "./types";

type FarmRow = Database["public"]["Tables"]["farms"]["Row"];
type FarmStageRow = Database["public"]["Tables"]["farm_stages"]["Row"];
type TemplateRow = Database["public"]["Tables"]["stage_templates"]["Row"];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class FarmDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FarmDataError";
  }
}

function toSummaryStage(stage: ScheduledStage, today: CalendarDate, headsUpDays: number): SummaryStage {
  return {
    position: stage.position,
    name: stage.name,
    isDone: stage.isDone,
    status: getStatus(stage, today, headsUpDays),
    dueDate: stage.dueDate ?? stage.windowStart ?? null,
  };
}

function summarise(
  farm: FarmRow,
  stageRows: FarmStageRow[],
  templateRows: TemplateRow[],
  windows: ReturnType<typeof mapWindows>,
  today: CalendarDate,
  headsUpDays: number,
): FarmSummary {
  const scheduled = computeSchedule(
    mapTemplates(templateRows),
    windows,
    mapFarmInput(farm),
    mapStageStates(stageRows, templateRows),
  );

  return buildFarmSummary(
    {
      id: farm.id,
      name: farm.name,
      location: farm.location,
      sizeValue: farm.size_value,
      sizeUnit: farm.size_unit,
    },
    scheduled.map((stage) => toSummaryStage(stage, today, headsUpDays)),
    today,
  );
}

/** Loads every farm and its stage state in a fixed number of queries. */
export async function getFarmSummaries(): Promise<FarmSummary[]> {
  const supabase = await createClient();

  const [templateResult, windowResult, settingsResult, farmResult, stageResult] =
    await Promise.all([
      supabase.from("stage_templates").select("*"),
      supabase.from("season_windows").select("*"),
      supabase.from("alert_settings").select("*").limit(1).maybeSingle(),
      supabase.from("farms").select("*"),
      supabase.from("farm_stages").select("*"),
    ]);

  if (
    templateResult.error ||
    windowResult.error ||
    settingsResult.error ||
    farmResult.error ||
    stageResult.error
  ) {
    throw new FarmDataError("Could not load farms.");
  }

  const today = todayInLondon(new Date());
  const templateRows = templateResult.data ?? [];
  const windows = mapWindows(windowResult.data ?? []);
  const headsUpDays = settingsResult.data?.heads_up_days ?? defaultAlertSettings.headsUpDays;

  const stagesByFarm = new Map<string, FarmStageRow[]>();
  for (const stage of stageResult.data ?? []) {
    const list = stagesByFarm.get(stage.farm_id);
    if (list) list.push(stage);
    else stagesByFarm.set(stage.farm_id, [stage]);
  }

  return (farmResult.data ?? [])
    .map((farm) =>
      summarise(
        farm,
        stagesByFarm.get(farm.id) ?? [],
        templateRows,
        windows,
        today,
        headsUpDays,
      ),
    )
    .sort((left, right) => left.name.localeCompare(right.name, "en-GB"));
}

/** Loads one farm for the edit form and the farm page. Unknown ids go to not-found. */
export async function getFarmById(id: string): Promise<FarmDetail> {
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();

  const [farmResult, templateResult, windowResult, settingsResult, stageResult] =
    await Promise.all([
      supabase.from("farms").select("*").eq("id", id).maybeSingle(),
      supabase.from("stage_templates").select("*"),
      supabase.from("season_windows").select("*"),
      supabase.from("alert_settings").select("*").limit(1).maybeSingle(),
      supabase.from("farm_stages").select("*").eq("farm_id", id),
    ]);

  if (
    farmResult.error ||
    templateResult.error ||
    windowResult.error ||
    settingsResult.error ||
    stageResult.error
  ) {
    throw new FarmDataError("Could not load the farm.");
  }

  if (!farmResult.data) notFound();

  const farm = farmResult.data;
  const templateRows = templateResult.data ?? [];
  const today = todayInLondon(new Date());
  const headsUpDays = settingsResult.data?.heads_up_days ?? defaultAlertSettings.headsUpDays;
  const summary = summarise(
    farm,
    stageResult.data ?? [],
    templateRows,
    mapWindows(windowResult.data ?? []),
    today,
    headsUpDays,
  );

  return {
    ...summary,
    notes: farm.notes,
    sizeValue: farm.size_value,
    sizeUnit: farm.size_unit,
    plantingDate: (farm.planting_date as CalendarDate | null) ?? null,
    scheduleAnchorDate: farm.schedule_anchor_date as CalendarDate,
  };
}

/** Stage choices for the Add farm form. Planting is found by its window key. */
export async function getStageConfig(): Promise<StageConfig> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stage_templates")
    .select("id, position, name, window_key")
    .order("position", { ascending: true });

  if (error) throw new FarmDataError("Could not load stages.");

  const rows = data ?? [];
  const planting = rows.find((row) => row.window_key === "planting");

  if (rows.length === 0 || !planting) {
    throw new FarmDataError("Could not load stages.");
  }

  return {
    stages: rows.map((row) => ({ position: row.position, name: row.name })),
    plantingPosition: planting.position,
  };
}
