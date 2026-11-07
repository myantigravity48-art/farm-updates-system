import { notFound } from "next/navigation";
import {
  computeSchedule,
  defaultAlertSettings,
  getStatus,
  todayInLondon,
  type CalendarDate,
} from "@/lib/schedule";
import { PHOTO_BUCKET, PHOTO_SIGNED_URL_SECONDS } from "@/lib/photos/validate";
import { createClient } from "@/lib/supabase/server";
import { buildStageRows } from "./build-stage-rows";
import { buildFarmSummary } from "./build-summary";
import { mapFarmInput, mapStageStates, mapTemplates, mapWindows } from "./map-rows";
import type { FarmDetailView, FarmNote, FarmPhoto } from "./types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const NOTES_LIMIT = 50;
const PHOTOS_LIMIT = 60;

/**
 * Loads the Farm detail page through the signed-in user's session, so
 * row-level security applies. An unknown or malformed id goes to not-found.
 * Today is computed once here and passed into the pure builders.
 */
export async function getFarmDetail(id: string): Promise<FarmDetailView> {
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();

  const [
    farmResult,
    templateResult,
    windowResult,
    settingsResult,
    stageResult,
    noteResult,
    photoResult,
  ] = await Promise.all([
    supabase.from("farms").select("*").eq("id", id).maybeSingle(),
    supabase.from("stage_templates").select("*"),
    supabase.from("season_windows").select("*"),
    supabase.from("alert_settings").select("*").limit(1).maybeSingle(),
    supabase.from("farm_stages").select("*").eq("farm_id", id),
    supabase
      .from("notes")
      .select("*")
      .eq("farm_id", id)
      .order("created_at", { ascending: false })
      .limit(NOTES_LIMIT),
    supabase
      .from("photos")
      .select("*")
      .eq("farm_id", id)
      .order("created_at", { ascending: false })
      .limit(PHOTOS_LIMIT),
  ]);

  if (
    farmResult.error ||
    templateResult.error ||
    windowResult.error ||
    settingsResult.error ||
    stageResult.error ||
    noteResult.error ||
    photoResult.error
  ) {
    throw new Error("Could not load the farm.");
  }

  if (!farmResult.data) notFound();

  const farm = farmResult.data;
  const templateRows = templateResult.data ?? [];
  const stageRows = stageResult.data ?? [];
  const templates = mapTemplates(templateRows);
  const today = todayInLondon(new Date());
  const headsUpDays = settingsResult.data?.heads_up_days ?? defaultAlertSettings.headsUpDays;
  const scheduled = computeSchedule(
    templates,
    mapWindows(windowResult.data ?? []),
    mapFarmInput(farm),
    mapStageStates(stageRows, templateRows),
  );

  const summary = buildFarmSummary(
    {
      id: farm.id,
      name: farm.name,
      location: farm.location,
      sizeValue: farm.size_value,
      sizeUnit: farm.size_unit,
    },
    scheduled.map((stage) => ({
      position: stage.position,
      name: stage.name,
      isDone: stage.isDone,
      status: getStatus(stage, today, headsUpDays),
      dueDate: stage.dueDate ?? stage.windowStart ?? null,
    })),
    today,
  );

  const states = mapStageStates(stageRows, templateRows);
  const overrideByPosition = new Map(
    states.map((state) => [state.position, state.dueDateOverride] as const),
  );
  const rowByPosition = new Map(
    stageRows.flatMap((row) => {
      const position = templateRows.find((template) => template.id === row.template_id)?.position;
      return position === undefined ? [] : [[position, row] as const];
    }),
  );
  const scheduledByPosition = new Map(
    scheduled.map((stage) => [stage.position, stage] as const),
  );

  const stages = buildStageRows(
    templates.flatMap((template) => {
      const stage = scheduledByPosition.get(template.position);
      if (!stage) return [];
      return [
        {
          template,
          scheduled: stage,
          dueDateOverride: overrideByPosition.get(template.position) ?? null,
          id: rowByPosition.get(template.position)?.id,
          doneByName: rowByPosition.get(template.position)?.done_by_name,
          doneNote: rowByPosition.get(template.position)?.done_note,
        },
      ];
    }),
    today,
    headsUpDays,
  );

  const positionByTemplateId = new Map(
    templateRows.map((row) => [row.id, row.position] as const),
  );
  const nameByPosition = new Map(
    templates.map((template) => [template.position, template.name] as const),
  );
  const stageIdByPosition = new Map<number, string>();
  const stageNameById = new Map<string, string>();

  for (const row of stageRows) {
    const position = positionByTemplateId.get(row.template_id);
    if (position === undefined) continue;
    stageIdByPosition.set(position, row.id);
    const name = nameByPosition.get(position);
    if (name) stageNameById.set(row.id, name);
  }

  const stageOptions = templates.flatMap((template) => {
    const stageId = stageIdByPosition.get(template.position);
    return stageId
      ? [{ id: stageId, position: template.position, name: template.name }]
      : [];
  });

  const notes: FarmNote[] = (noteResult.data ?? []).map((row) => ({
    id: row.id,
    body: row.body,
    authorName: row.author_name ?? null,
    createdAt: row.created_at,
    stageId: row.farm_stage_id,
    stageName: row.farm_stage_id
      ? (stageNameById.get(row.farm_stage_id) ?? null)
      : null,
  }));

  const photoRows = photoResult.data ?? [];
  const signedByPath = await signPhotoPaths(
    supabase,
    photoRows.map((row) => row.storage_path),
  );

  const photos: FarmPhoto[] = photoRows.map((row) => ({
    id: row.id,
    caption: row.caption,
    takenOn: (row.taken_on as CalendarDate | null) ?? null,
    authorName: row.author_name ?? null,
    stageName: row.farm_stage_id ? (stageNameById.get(row.farm_stage_id) ?? null) : null,
    url: signedByPath.get(row.storage_path) ?? null,
  }));

  return {
    id: summary.id,
    name: summary.name,
    location: summary.location,
    sizeLabel: summary.sizeLabel,
    sizeValue: farm.size_value,
    sizeUnit: farm.size_unit,
    farmNotes: farm.notes,
    status: summary.status,
    doneCount: summary.doneCount,
    totalStages: summary.totalStages,
    plantingDate: (farm.planting_date as CalendarDate | null) ?? null,
    today,
    stages,
    stageOptions,
    notes,
    photos,
  };
}

/**
 * One batch call for every photo. A failure on any path, or on the batch
 * itself, leaves that tile with no URL so the page keeps working.
 */
async function signPhotoPaths(
  supabase: Awaited<ReturnType<typeof createClient>>,
  paths: string[],
): Promise<Map<string, string>> {
  const signedByPath = new Map<string, string>();
  if (paths.length === 0) return signedByPath;

  try {
    const { data, error } = await supabase.storage
      .from(PHOTO_BUCKET)
      .createSignedUrls(paths, PHOTO_SIGNED_URL_SECONDS);

    if (error || !data) return signedByPath;

    for (const item of data) {
      if (item.path && item.signedUrl && !item.error) {
        signedByPath.set(item.path, item.signedUrl);
      }
    }
  } catch {
    // Placeholder tiles are shown for every photo.
  }

  return signedByPath;
}
