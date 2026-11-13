import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { mapTemplates, mapWindows, mapFarmInput, mapStageStates } from "@/lib/data/map-rows";
import type { Database } from "@/lib/supabase/database.types";
import type { AlertJobData, ClaimedAlert, AlertJobDependencies } from "./run";
import { sendEmail } from "@/lib/email/send";

type Tables = Database["public"]["Tables"];
type Farm = Tables["farms"]["Row"];
type FarmStage = Tables["farm_stages"]["Row"];
type Template = Tables["stage_templates"]["Row"];
type Window = Tables["season_windows"]["Row"];
type Recipient = Tables["recipients"]["Row"];
type Notification = Tables["notification_log"]["Row"];

async function loadAll<T>(query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += 1000) {
    const result = await query(from, from + 999);
    if (result.error) throw new Error("alert_data_load_failed");
    const page = result.data ?? [];
    all.push(...page);
    if (page.length < 1000) return all;
  }
}

export async function loadAlertData(): Promise<AlertJobData> {
  const supabase = createAdminClient();
  const [farms, farmStages, templates, windows, settingsResult, recipients, sent] = await Promise.all([
    loadAll<Farm>((from, to) => supabase.from("farms").select("*").order("id").range(from, to)),
    loadAll<FarmStage>((from, to) => supabase.from("farm_stages").select("*").order("id").range(from, to)),
    loadAll<Template>((from, to) => supabase.from("stage_templates").select("*").order("position").range(from, to)),
    loadAll<Window>((from, to) => supabase.from("season_windows").select("*").order("key").range(from, to)),
    supabase.from("alert_settings").select("*").eq("id", true).single(),
    loadAll<Recipient>((from, to) => supabase.from("recipients").select("*").eq("enabled", true).order("id").range(from, to)),
    loadAll<Notification>((from, to) => supabase.from("notification_log").select("*").eq("status", "sent").order("id").range(from, to)),
  ]);
  if (settingsResult.error || !settingsResult.data) throw new Error("alert_settings_load_failed");
  const stageRowsByFarm = new Map<string, FarmStage[]>();
  for (const stage of farmStages) stageRowsByFarm.set(stage.farm_id, [...(stageRowsByFarm.get(stage.farm_id) ?? []), stage]);
  return {
    farms: farms.map((farm) => ({
      id: farm.id,
      name: farm.name,
      ...mapFarmInput(farm),
      stages: mapStageStates(stageRowsByFarm.get(farm.id) ?? [], templates).flatMap((state) => {
        const template = templates.find((candidate) => candidate.position === state.position);
        const row = template && (stageRowsByFarm.get(farm.id) ?? []).find((candidate) => candidate.template_id === template.id);
        return row ? [{ ...state, farmStageId: row.id }] : [];
      }),
    })),
    templates: mapTemplates(templates),
    windows: mapWindows(windows),
    settings: {
      headsUpDays: settingsResult.data.heads_up_days,
      reminderDays: settingsResult.data.reminder_days,
      overdueEnabled: settingsResult.data.overdue_enabled,
      overdueRepeatDays: settingsResult.data.overdue_repeat_days,
      windowNudgeDays: settingsResult.data.window_nudge_days,
      sendHourLondon: settingsResult.data.send_hour_london,
    },
    recipients: recipients.map((row) => ({ id: row.id, name: row.name, email: row.email, enabled: row.enabled })),
    sent: sent.flatMap((row) => row.alert_type === "done_notice" ? [] : [{ recipientId: row.recipient_id, farmStageId: row.farm_stage_id, alertType: row.alert_type, occurrenceKey: row.occurrence_key }]),
  };
}

export function createAlertJobDependencies(): AlertJobDependencies {
  const supabase = createAdminClient();
  return {
    now: () => new Date(),
    loadData: loadAlertData,
    async claim(recipientId, keys) {
      const rows = keys.map((key) => ({ farm_stage_id: key.farmStageId, recipient_id: recipientId, alert_type: key.alertType, occurrence_key: key.occurrenceKey }));
      const { data, error } = await supabase.rpc("claim_alert_rows", { p_rows: rows });
      if (error) throw new Error("alert_claim_failed");
      return (data ?? []).map((row) => ({ id: row.id, farmStageId: row.farm_stage_id, recipientId: row.recipient_id, alertType: row.alert_type as ClaimedAlert["alertType"], occurrenceKey: row.occurrence_key }));
    },
    async send(input) {
      const result = await sendEmail({ to: input.email, subject: input.subject, html: input.html, text: input.text, idempotencyKey: input.idempotencyKey });
      return result.ok ? result : { ...result, retry: result.retry ?? false };
    },
    async finish(ids, status, providerMessageId, errorCode) {
      const { error } = await supabase.rpc("finish_alert_rows", { p_ids: ids, p_status: status, p_provider_message_id: providerMessageId, p_error: errorCode });
      if (error) throw new Error("alert_finish_failed");
    },
  };
}
