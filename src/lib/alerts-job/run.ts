import { createHash } from "node:crypto";
import { todayInLondon, isSendHourInLondon } from "@/lib/schedule";
import { planDailyAlerts, type DailyAlertPlanInput, type PlannedRecipientAlerts, type SentAlertKey } from "@/lib/email/plan";
import { renderAlertEmail } from "@/lib/email/render";
import { renderAlertEmailHtml } from "@/lib/email/render-html";

export interface ClaimedAlert extends Pick<SentAlertKey, "farmStageId" | "recipientId" | "alertType" | "occurrenceKey"> { id: string }
export interface AlertJobData extends Omit<DailyAlertPlanInput, "today" | "sent"> {
  settings: DailyAlertPlanInput["settings"] & { sendHourLondon: number };
  recipients: Array<DailyAlertPlanInput["recipients"][number] & { email: string }>;
  sent: SentAlertKey[];
}
export interface AlertJobDependencies {
  now: () => Date;
  loadData: () => Promise<AlertJobData>;
  claim: (recipientId: string, keys: PlannedRecipientAlerts["keys"]) => Promise<ClaimedAlert[]>;
  send: (input: { recipientId: string; email: string; subject: string; html: string; text: string; idempotencyKey: string }) => Promise<{ ok: true; id: string } | { ok: false; retry: boolean; errorCode: string }>;
  finish: (ids: string[], status: "sent" | "failed", providerMessageId: string | null, error: string | null) => Promise<void>;
}

export interface AlertJobOptions { dryRun: boolean; force: boolean }

const pause = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function matchEntry(entry: PlannedRecipientAlerts["entries"][number], row: ClaimedAlert): boolean {
  return entry.key.farmStageId === row.farmStageId && entry.key.alertType === row.alertType && entry.key.occurrenceKey === row.occurrenceKey;
}

export function buildAlertIdempotencyKey(recipientId: string, today: string, claimedIds: string[]): string {
  const idDigest = createHash("sha256").update(claimedIds.slice().sort().join("\n")).digest("hex");
  return `${recipientId}:${today}:${idDigest}`;
}

export async function runDailyAlerts(deps: AlertJobDependencies, options: AlertJobOptions) {
  const data = await deps.loadData();
  const now = deps.now();
  const today = todayInLondon(now);
  if (!options.force && !isSendHourInLondon(now, data.settings.sendHourLondon)) return { ok: true, skipped: "not send hour" } as const;
  const plans = planDailyAlerts({ ...data, today, recipients: data.recipients });
  const recipientById = new Map(data.recipients.map((recipient) => [recipient.id, recipient]));
  if (!data.recipients.some((recipient) => recipient.enabled) || plans.length === 0) return { ok: true, skipped: "nothing to send" } as const;
  if (options.dryRun) {
    const alertsByType: Record<string, number> = {};
    for (const plan of plans) for (const item of plan.items) alertsByType[item.type] = (alertsByType[item.type] ?? 0) + 1;
    return { ok: true, dryRun: true, recipientsWithAlerts: plans.length, alertsByType } as const;
  }

  let sentCount = 0;
  let failedCount = 0;
  let rateLimited = false;
  let hasSent = false;
  const recipients: Array<{ index: number; alertCount: number; status: "sent" | "failed" | "skipped" }> = [];
  for (let index = 0; index < plans.length; index += 1) {
    const plan = plans[index];
    const recipient = recipientById.get(plan.recipientId)!;
    const claimed = await deps.claim(plan.recipientId, plan.keys);
    const ids = claimed.map((row) => row.id);
    try {
      const entries = plan.entries.filter((entry) => claimed.some((row) => matchEntry(entry, row)));
      if (!claimed.length || !entries.length) {
        recipients.push({ index: index + 1, alertCount: 0, status: "skipped" });
        continue;
      }
      const items = entries.map(({ item }) => item);
      const common = { alerts: items, today, appUrl: process.env.APP_URL ?? "" };
      const plain = renderAlertEmail(common);
      const html = renderAlertEmailHtml(common);
      if (hasSent) await pause(600);
      const result = await deps.send({
        recipientId: recipient.id,
        email: recipient.email,
        subject: plain.subject,
        html: html.html,
        text: plain.text,
        idempotencyKey: buildAlertIdempotencyKey(recipient.id, today, ids),
      });
      hasSent = true;
      if (result.ok) {
        await deps.finish(ids, "sent", result.id, null);
        sentCount += entries.length;
        recipients.push({ index: index + 1, alertCount: entries.length, status: "sent" });
      } else {
        await deps.finish(ids, "failed", null, result.errorCode);
        failedCount += entries.length;
        recipients.push({ index: index + 1, alertCount: entries.length, status: "failed" });
        if (result.retry && result.errorCode === "resend_429") { rateLimited = true; break; }
      }
    } catch (error) {
      await deps.finish(ids, "failed", null, error instanceof Error ? "job_exception" : "job_unknown_error");
      throw error;
    }
  }
  return { ok: failedCount === 0, sentCount, failedCount, rateLimited, recipients } as const;
}
