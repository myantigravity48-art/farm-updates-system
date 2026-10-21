"use server";

import { revalidatePath } from "next/cache";
import { getStageConfig } from "@/lib/data/farms";
import { todayInLondon } from "@/lib/schedule";
import { MissingSupabaseConfigError } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { mapDatabaseError, NETWORK_ERROR_MESSAGE } from "./errors";
import type { FarmFormState } from "./form-state";
import { BULK_MAX_ROWS } from "./parse-bulk";
import {
  validateBulkFarm,
  validateFarmDetails,
  validateNewFarm,
  type FarmFieldErrors,
} from "./validate";

const SESSION_ENDED = "Your session ended. Sign in again.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

function readField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

async function signedInClient(): Promise<SupabaseClient | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return supabase;
}

function refreshFarmLists(farmId?: string) {
  revalidatePath("/", "layout");
  revalidatePath("/farms");
  if (farmId) revalidatePath(`/farms/${farmId}`);
}

function errorMessage(error: unknown): string {
  if (error instanceof MissingSupabaseConfigError) return error.message;
  return NETWORK_ERROR_MESSAGE;
}

interface RawBulkRow {
  name: string;
  location: string;
  sizeValue: string;
  sizeUnit: string;
}

function readBulkRow(value: unknown): RawBulkRow | null {
  if (typeof value !== "object" || value === null) return null;
  const row = value as Record<string, unknown>;
  const read = (key: string) => (typeof row[key] === "string" ? (row[key] as string) : "");

  return {
    name: read("name"),
    location: read("location"),
    sizeValue: read("sizeValue"),
    sizeUnit: read("sizeUnit"),
  };
}

export async function addFarm(
  _previous: FarmFormState,
  formData: FormData,
): Promise<FarmFormState> {
  const supabase = await signedInClient();
  if (!supabase) return { status: "error", message: SESSION_ENDED };

  const raw = {
    name: readField(formData, "name"),
    location: readField(formData, "location"),
    sizeValue: readField(formData, "sizeValue"),
    sizeUnit: readField(formData, "sizeUnit"),
    notes: readField(formData, "notes"),
    currentPosition: readField(formData, "currentPosition"),
    plantingDate: readField(formData, "plantingDate"),
  };

  try {
    const stageConfig = await getStageConfig();
    const today = todayInLondon(new Date());
    const validation = validateNewFarm(raw, {
      today,
      positions: stageConfig.stages.map((stage) => stage.position),
      plantingPosition: stageConfig.plantingPosition,
    });

    if (!validation.ok || !validation.values) {
      return {
        status: "error",
        message: "Fix the highlighted fields and try again.",
        fieldErrors: validation.errors,
      };
    }

    const values = validation.values;
    const { data, error } = await supabase.rpc("create_farm", {
      p_name: values.name,
      p_location: values.location,
      p_size_value: values.sizeValue,
      p_size_unit: values.sizeUnit,
      p_notes: values.notes,
      p_current_position: values.currentPosition,
      p_planting_date: values.plantingDate,
      p_anchor_date: today,
    });

    if (error) {
      return {
        status: "error",
        message: mapDatabaseError(error, "Could not add the farm. Try again.").message,
      };
    }

    if (!data) {
      return { status: "error", message: "Could not add the farm. Try again." };
    }

    refreshFarmLists(data);
    return { status: "success", message: "Farm added" };
  } catch (error) {
    return { status: "error", message: errorMessage(error) };
  }
}

export async function addFarmsBulk(
  _previous: FarmFormState,
  formData: FormData,
): Promise<FarmFormState> {
  const supabase = await signedInClient();
  if (!supabase) return { status: "error", message: SESSION_ENDED };

  const raw = readField(formData, "rows");
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return { status: "error", message: "Add at least one row, then try again." };
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    return { status: "error", message: "Add at least one row, then try again." };
  }

  if (parsed.length > BULK_MAX_ROWS) {
    return { status: "error", message: `Add ${BULK_MAX_ROWS} farms or fewer at a time.` };
  }

  const rows = parsed.map(readBulkRow);
  if (rows.some((row) => row === null)) {
    return { status: "error", message: "Check every row, then try again." };
  }

  const rowErrors: Record<number, string> = {};
  const payload: Array<{
    name: string;
    location: string | null;
    size_value: number | null;
    size_unit: string | null;
  }> = [];

  rows.forEach((row, index) => {
    if (!row) return;
    const validation = validateBulkFarm(row);

    if (!validation.ok || !validation.values) {
      const errors: FarmFieldErrors = validation.errors;
      rowErrors[index] =
        errors.name ?? errors.size ?? errors.location ?? "Check this row.";
      return;
    }

    payload.push({
      name: validation.values.name,
      location: validation.values.location,
      size_value: validation.values.sizeValue,
      size_unit: validation.values.sizeUnit,
    });
  });

  if (Object.keys(rowErrors).length > 0) {
    return {
      status: "error",
      message: "Fix the highlighted rows and try again.",
      rowErrors,
    };
  }

  try {
    const { data, error } = await supabase.rpc("create_farms_bulk", {
      p_rows: payload,
      p_anchor_date: todayInLondon(new Date()),
    });

    if (error) {
      const mapped = mapDatabaseError(error, "Could not add the farms. Try again.");
      if (mapped.row) {
        return {
          status: "error",
          message: "Fix the highlighted row and try again.",
          rowErrors: { [mapped.row - 1]: mapped.rowMessage ?? mapped.message },
        };
      }
      return { status: "error", message: mapped.message };
    }

    if (!data) {
      return { status: "error", message: "Could not add the farms. Try again." };
    }

    refreshFarmLists();
    return { status: "success", message: "Farms added" };
  } catch (error) {
    return { status: "error", message: errorMessage(error) };
  }
}

export async function updateFarm(
  _previous: FarmFormState,
  formData: FormData,
): Promise<FarmFormState> {
  const supabase = await signedInClient();
  if (!supabase) return { status: "error", message: SESSION_ENDED };

  const farmId = readField(formData, "farmId").trim();
  if (!UUID.test(farmId)) return { status: "error", message: "That farm could not be found." };

  const validation = validateFarmDetails({
    name: readField(formData, "name"),
    location: readField(formData, "location"),
    sizeValue: readField(formData, "sizeValue"),
    sizeUnit: readField(formData, "sizeUnit"),
    notes: readField(formData, "notes"),
  });

  if (!validation.ok || !validation.values) {
    return {
      status: "error",
      message: "Fix the highlighted fields and try again.",
      fieldErrors: validation.errors,
    };
  }

  try {
    const values = validation.values;
    const { data, error } = await supabase
      .from("farms")
      .update({
        name: values.name,
        location: values.location,
        size_value: values.sizeValue,
        size_unit: values.sizeUnit,
        notes: values.notes,
      })
      .eq("id", farmId)
      .select("id")
      .maybeSingle();

    if (error) {
      return {
        status: "error",
        message: mapDatabaseError(error, "Could not save the farm. Try again.").message,
      };
    }

    if (!data) return { status: "error", message: "That farm could not be found." };

    refreshFarmLists(farmId);
    return { status: "success", message: "Farm updated" };
  } catch (error) {
    return { status: "error", message: errorMessage(error) };
  }
}
