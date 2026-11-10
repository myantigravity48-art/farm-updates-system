"use server";

import { revalidatePath } from "next/cache";
import { authorNameFromUser } from "@/lib/auth/author-name";
import { SESSION_ENDED } from "@/lib/auth/messages";
import { todayInLondon, type CalendarDate } from "@/lib/schedule";
import { createClient } from "@/lib/supabase/server";
import { mapFarmInput, mapStageStates, mapTemplates, mapWindows } from "@/lib/data/map-rows";
import {
  stageActionErrorMessage,
  validateDateInput,
  validateDoneInput,
  validateOverrideInput,
} from "./logic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UNKNOWN_ERROR = "Something went wrong. Try again.";

interface ActionResult {
  ok: boolean;
  message: string;
}

function messageForError(error: unknown, plantingDate?: CalendarDate | null, anchorName?: string): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = String((error as { message: unknown }).message);
    const code = message.split(":", 1)[0];
    if (/^[a-z_]+$/.test(code)) return stageActionErrorMessage(code, plantingDate, anchorName);
  }
  return UNKNOWN_ERROR;
}

function revalidateFarm(farmId: string) {
  revalidatePath("/");
  revalidatePath("/farms");
  revalidatePath(`/farms/${farmId}`);
}

function validUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value.trim());
}

export async function getMarkDonePreviewData(farmStageId: string) {
  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return { ok: false as const, message: SESSION_ENDED };
    const today = todayInLondon(new Date());
    if (!validUuid(farmStageId)) return { ok: false as const, message: "This stage could not be found." };

    const [{ data: stage, error: stageError }, { data: templates, error: templateError }, { data: windows, error: windowError }] = await Promise.all([
      supabase.from("farm_stages").select("*").eq("id", farmStageId.trim()).maybeSingle(),
      supabase.from("stage_templates").select("*"),
      supabase.from("season_windows").select("*"),
    ]);
    if (stageError || templateError || windowError || !stage) {
      return { ok: false as const, message: "Could not load this stage. Try again." };
    }
    const [{ data: farm, error: farmError }, { data: stageRows, error: stagesError }] = await Promise.all([
      supabase.from("farms").select("*").eq("id", stage.farm_id).maybeSingle(),
      supabase.from("farm_stages").select("*").eq("farm_id", stage.farm_id),
    ]);
    if (farmError || stagesError || !farm) return { ok: false as const, message: "Could not load this farm. Try again." };

    const templateRows = templates ?? [];
    const targetTemplate = templateRows.find((row) => row.id === stage.template_id);
    if (!targetTemplate) return { ok: false as const, message: "Could not load this stage. Try again." };
    const positionByTemplateId = new Map(templateRows.map((row) => [row.id, row.position] as const));
    const nameByTemplateId = new Map(templateRows.map((row) => [row.id, row.name] as const));

    return {
      ok: true as const,
      message: "Stage details loaded.",
      data: {
        farmId: farm.id,
        farmName: farm.name,
        stageId: stage.id,
        stageName: targetTemplate.name,
        stagePosition: targetTemplate.position,
        stageTriggerType: targetTemplate.trigger_type,
        stageWindowKey: targetTemplate.window_key,
        today,
        plantingDate: (farm.planting_date as CalendarDate | null) ?? null,
        anchorDate: farm.schedule_anchor_date as CalendarDate,
        templates: mapTemplates(templateRows),
        windows: mapWindows(windows ?? []),
        stages: mapStageStates(stageRows ?? [], templateRows),
        stageRows: (stageRows ?? []).flatMap((row) => {
          const position = positionByTemplateId.get(row.template_id);
          const name = nameByTemplateId.get(row.template_id);
          return position === undefined || !name ? [] : [{
            id: row.id,
            position,
            name,
            isDone: row.is_done,
            doneDate: (row.done_date as CalendarDate | null) ?? null,
            doneByName: row.done_by_name,
            doneNote: row.done_note,
            dueDateOverride: (row.due_date_override as CalendarDate | null) ?? null,
            windowKey: templateRows.find((item) => item.id === row.template_id)?.window_key ?? null,
          }];
        }),
        farm: mapFarmInput(farm),
      },
    };
  } catch {
    return { ok: false as const, message: UNKNOWN_ERROR };
  }
}

export async function markStageDone(
  farmStageId: string,
  dateValue: string,
  noteValue: string,
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return { ok: false, message: SESSION_ENDED };
    const today = todayInLondon(new Date());
    const id = typeof farmStageId === "string" ? farmStageId.trim() : "";
    if (!validUuid(id)) return { ok: false, message: "This stage could not be found." };
    if (typeof dateValue !== "string" || typeof noteValue !== "string") return { ok: false, message: "Enter a valid date and note." };

    const { data: stage, error: stageError } = await supabase
      .from("farm_stages").select("id, farm_id, template_id, is_done").eq("id", id).maybeSingle();
    if (stageError || !stage) return { ok: false, message: "This stage could not be found. Refresh the page." };
    const [{ data: template }, { data: farm }] = await Promise.all([
      supabase.from("stage_templates").select("trigger_type, anchor_window_key").eq("id", stage.template_id).maybeSingle(),
      supabase.from("farms").select("planting_date").eq("id", stage.farm_id).maybeSingle(),
    ]);
    if (!template || !farm) return { ok: false, message: UNKNOWN_ERROR };
    const plantingDate = (farm.planting_date as CalendarDate | null) ?? null;
    const validation = validateDoneInput({
      date: dateValue,
      note: noteValue,
      today,
      stage: { triggerType: template.trigger_type },
      plantingDate,
    });
    if (validation) return { ok: false, message: validation };

    const { error } = await supabase.rpc("mark_stage_done", {
      p_farm_stage_id: id,
      p_done_date: dateValue,
      p_note: noteValue,
      p_done_by_name: authorNameFromUser(authData.user),
      p_today: today,
    });
    if (error) {
      let anchorName: string | undefined;
      if (template.trigger_type === "after_stage_done" && template.anchor_window_key) {
        const { data: anchor } = await supabase.from("stage_templates").select("name").eq("window_key", template.anchor_window_key).maybeSingle();
        anchorName = anchor?.name;
      }
      return { ok: false, message: messageForError(error, plantingDate, anchorName) };
    }
    revalidateFarm(stage.farm_id);
    return { ok: true, message: "Stage marked done." };
  } catch {
    return { ok: false, message: UNKNOWN_ERROR };
  }
}

export async function undoStageDone(farmStageId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return { ok: false, message: SESSION_ENDED };
    todayInLondon(new Date());
    const id = typeof farmStageId === "string" ? farmStageId.trim() : "";
    if (!validUuid(id)) return { ok: false, message: "This stage could not be found." };
    const { data: stage, error: stageError } = await supabase.from("farm_stages").select("farm_id").eq("id", id).maybeSingle();
    if (stageError || !stage) return { ok: false, message: "This stage could not be found. Refresh the page." };
    const { error } = await supabase.rpc("undo_stage_done", { p_farm_stage_id: id });
    if (error) return { ok: false, message: messageForError(error) };
    revalidateFarm(stage.farm_id);
    return { ok: true, message: "Stage marked not done." };
  } catch {
    return { ok: false, message: UNKNOWN_ERROR };
  }
}

export async function setPlantingDate(farmId: string, dateValue: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return { ok: false, message: SESSION_ENDED };
    const today = todayInLondon(new Date());
    const id = typeof farmId === "string" ? farmId.trim() : "";
    if (!validUuid(id)) return { ok: false, message: "This farm could not be found." };
    if (typeof dateValue !== "string") return { ok: false, message: "Enter a valid date." };
    const validation = validateDateInput(dateValue, today);
    if (validation) return { ok: false, message: validation };
    const { error } = await supabase.rpc("set_planting_date", {
      p_farm_id: id,
      p_date: dateValue,
      p_today: today,
    });
    if (error) return { ok: false, message: messageForError(error, dateValue as CalendarDate) };
    revalidateFarm(id);
    return { ok: true, message: "Planting date updated." };
  } catch {
    return { ok: false, message: UNKNOWN_ERROR };
  }
}

export async function setStageDueOverride(
  farmStageId: string,
  dateValue: string | null,
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return { ok: false, message: SESSION_ENDED };
    todayInLondon(new Date());
    const id = typeof farmStageId === "string" ? farmStageId.trim() : "";
    if (!validUuid(id)) return { ok: false, message: "This stage could not be found." };
    if (dateValue !== null && typeof dateValue !== "string") return { ok: false, message: "Enter a valid date." };
    const validation = validateOverrideInput(dateValue);
    if (validation) return { ok: false, message: validation };
    const { data: stage, error: stageError } = await supabase.from("farm_stages").select("farm_id").eq("id", id).maybeSingle();
    if (stageError || !stage) return { ok: false, message: "This stage could not be found. Refresh the page." };
    const { error } = await supabase.rpc("set_stage_due_override", { p_farm_stage_id: id, p_date: dateValue });
    if (error) return { ok: false, message: messageForError(error) };
    revalidateFarm(stage.farm_id);
    return { ok: true, message: dateValue ? "Stage date updated." : "Schedule date restored." };
  } catch {
    return { ok: false, message: UNKNOWN_ERROR };
  }
}
