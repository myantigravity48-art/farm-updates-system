"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isDuplicateEmailError, validateRecipient, validateRecipientUpdate, validateTiming, type RecipientInput, type TimingValues } from "./validate";

type ActionResult = { ok: true; message?: string } | { ok: false; message: string; errors?: Record<string, string> };

function validId(id: unknown): id is string {
  return typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export async function addRecipient(input: RecipientInput): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { ok: false, message: "Your session has ended. Sign in again." };
  if (!input || typeof input.name !== "string" || typeof input.email !== "string" || (input.phone !== undefined && typeof input.phone !== "string")) {
    return { ok: false, message: "Check the recipient details and try again." };
  }

  const { count, error: countError } = await supabase.from("recipients").select("id", { count: "exact", head: true });
  if (countError) return { ok: false, message: "Could not check the alert list. Try again." };
  const validation = validateRecipient(input, count ?? 0);
  if (!validation.ok) return { ok: false, message: "Check the highlighted fields.", errors: validation.errors };

  const { error } = await supabase.from("recipients").insert({ ...validation.value, enabled: true });
  if (error) return { ok: false, message: isDuplicateEmailError(error.message) ? "That email address is already on the list." : "Could not add the recipient. Try again." };
  revalidatePath("/alerts");
  return { ok: true, message: "Recipient added." };
}

export async function updateRecipient(input: RecipientInput & { id: string }): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { ok: false, message: "Your session has ended. Sign in again." };
  if (!input || !validId(input.id) || typeof input.name !== "string" || typeof input.email !== "string" || (input.phone !== undefined && typeof input.phone !== "string")) {
    return { ok: false, message: "Check the recipient details and try again." };
  }
  const { data: current, error: currentError } = await supabase.from("recipients").select("id").eq("id", input.id).maybeSingle();
  if (currentError) return { ok: false, message: "Could not check the recipient. Try again." };
  if (!current) return { ok: false, message: "That person no longer exists. Refresh the page." };
  const { data: recipients, error: recipientsError } = await supabase.from("recipients").select("id, email");
  if (recipientsError) return { ok: false, message: "Could not check the alert list. Try again." };
  const validation = validateRecipientUpdate(input, input.id, recipients);
  if (!validation.ok) return { ok: false, message: "Check the highlighted fields.", errors: validation.errors };
  const { error } = await supabase.from("recipients").update(validation.value).eq("id", input.id);
  if (error) return { ok: false, message: isDuplicateEmailError(error.message) ? "That email address is already on the list." : "Could not update the recipient. Try again." };
  revalidatePath("/alerts");
  return { ok: true, message: "Recipient updated." };
}

export async function setRecipientEnabled(id: string, enabled: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { ok: false, message: "Your session has ended. Sign in again." };
  if (!validId(id) || typeof enabled !== "boolean") return { ok: false, message: "That recipient change is invalid." };

  const { error } = await supabase.from("recipients").update({ enabled }).eq("id", id);
  if (error) return { ok: false, message: "Could not update the recipient. Try again." };
  revalidatePath("/alerts");
  return { ok: true };
}

export async function removeRecipient(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { ok: false, message: "Your session has ended. Sign in again." };
  if (!validId(id)) return { ok: false, message: "That recipient is invalid." };

  const { error } = await supabase.from("recipients").delete().eq("id", id);
  if (error) return { ok: false, message: "Could not remove the recipient. Try again." };
  revalidatePath("/alerts");
  return { ok: true, message: "Recipient removed." };
}

export async function saveTimingSettings(input: TimingValues): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { ok: false, message: "Your session has ended. Sign in again." };
  if (!input || typeof input !== "object") return { ok: false, message: "Check the timing settings and try again." };
  const validation = validateTiming(input);
  if (!validation.ok) return { ok: false, message: "Check the highlighted settings.", errors: validation.errors };

  const { data, error } = await supabase
    .from("alert_settings")
    .update({
      heads_up_days: validation.value.headsUpDays,
      reminder_days: validation.value.reminderDays,
      overdue_enabled: validation.value.overdueEnabled,
      overdue_repeat_days: validation.value.overdueRepeatDays,
      window_nudge_days: validation.value.windowNudgeDays,
    })
    .eq("id", true)
    .select("id");
  if (error || !data?.length) return { ok: false, message: "Could not save timing settings. Try again." };
  revalidatePath("/alerts");
  return { ok: true, message: "Settings saved" };
}
