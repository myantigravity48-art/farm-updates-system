"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isDuplicateEmailError, validateRecipient, validateRecipientUpdate, validateTiming, type RecipientInput, type TimingValues } from "./validate";
import { createTestEmailLimiter, mapTestEmailError } from "@/lib/email/workflows";
import { sendEmail } from "@/lib/email/send";
import { renderAlertEmail } from "@/lib/email/render";
import { renderAlertEmailHtml } from "@/lib/email/render-html";
import { addDays, todayInLondon } from "@/lib/schedule";
import { emailTheme } from "@/lib/email/email-theme";

const testEmailLimiter = createTestEmailLimiter();

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
      done_notice_enabled: validation.value.doneNoticeEnabled,
    })
    .eq("id", true)
    .select("id");
  if (error || !data?.length) return { ok: false, message: "Could not save timing settings. Try again." };
  revalidatePath("/alerts");
  return { ok: true, message: "Settings saved" };
}

export async function sendTestEmail(recipientId: string): Promise<{ ok: boolean; message: string }> {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { ok: false, message: "Your session has ended. Sign in again." };
  if (!validId(recipientId)) return { ok: false, message: "Couldn't send the email. Try again." };
  if (!testEmailLimiter.tryAcquire(recipientId)) return { ok: false, message: mapTestEmailError("limited") };
  const [{ data: recipient, error: recipientError }, { data: settings, error: settingsError }] = await Promise.all([
    supabase.from("recipients").select("id, email").eq("id", recipientId).maybeSingle(),
    supabase.from("alert_settings").select("heads_up_days, reminder_days, overdue_repeat_days").limit(1).maybeSingle(),
  ]);
  if (recipientError || settingsError || !recipient || !settings) return { ok: false, message: "Couldn't send the email. Try again." };
  const today = todayInLondon(new Date());
  const alerts = [
    { type: "overdue" as const, farmId: "sample-obi", farmName: "Obi-Umuagbogho", stageName: "Land clearing", kind: "window" as const, date: addDays(today, -settings.overdue_repeat_days), windowEnd: addDays(today, -settings.overdue_repeat_days + 4), days: settings.overdue_repeat_days },
    { type: "reminder" as const, farmId: "sample-iyanuole", farmName: "Iyanuole", stageName: "Second round-weeding", kind: "date" as const, date: addDays(today, settings.reminder_days), days: settings.reminder_days },
    { type: "heads_up" as const, farmId: "sample-obaoba", farmName: "Obaoba", stageName: "First fertilizer", kind: "date" as const, date: addDays(today, settings.heads_up_days), days: settings.heads_up_days },
    { type: "window_open" as const, farmId: "sample-iyanuole", farmName: "Iyanuole", stageName: "Land clearing", kind: "window" as const, date: today, windowEnd: addDays(today, 11), days: 11 },
    { type: "reminder" as const, farmId: "sample-iyanuole", farmName: "Iyanuole", stageName: "Order seedlings", kind: "date" as const, date: addDays(today, settings.reminder_days), days: settings.reminder_days },
  ];
  const appUrl = process.env.APP_URL ?? "";
  if (!appUrl) return { ok: false, message: mapTestEmailError("email_not_configured", ["APP_URL"]) };
  const plain = renderAlertEmail({ alerts, today, appUrl });
  const html = renderAlertEmailHtml({ alerts, today, appUrl });
  const banner = "This is a test email. Nothing in it is real.";
  const result = await sendEmail({ to: recipient.email, subject: `[Test] ${plain.subject}`, text: `${banner}\n\n${plain.text}`, html: html.html.replace("<tr><td bgcolor=", `<tr><td><div style="padding:14px 20px;background-color:${emailTheme.dueSoon};color:${emailTheme.text};font-family:Arial,sans-serif;font-weight:bold;">${banner}</div></td></tr><tr><td bgcolor=`) });
  if (result.ok) return { ok: true, message: "Test email sent. Check the inbox, and the spam folder." };
  return { ok: false, message: mapTestEmailError(result.errorCode, result.missingEnv) };
}
