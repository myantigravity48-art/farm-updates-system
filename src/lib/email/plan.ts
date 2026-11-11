import { computeSchedule, diffInDays, getDueAlerts, type AlertSettings, type CalendarDate, type SeasonWindow, type StageTemplate, type StageState } from "@/lib/schedule";
import type { AlertItem } from "./render";

export interface PlannerFarm {
  id: string;
  name: string;
  plantingDate: CalendarDate | null;
  anchorDate: CalendarDate;
  stages: Array<StageState & { farmStageId: string }>;
}

export interface PlannerRecipient {
  id: string;
  name: string;
  enabled: boolean;
}

export interface SentAlertKey {
  recipientId: string;
  farmStageId: string;
  alertType: AlertItem["type"];
  occurrenceKey: string;
}

export interface DailyAlertPlanInput {
  today: CalendarDate;
  farms: PlannerFarm[];
  templates: StageTemplate[];
  windows: SeasonWindow[];
  settings: AlertSettings;
  recipients: PlannerRecipient[];
  sent: SentAlertKey[];
}

export interface PlannedRecipientAlerts {
  recipientId: string;
  items: AlertItem[];
  keys: Array<Pick<SentAlertKey, "farmStageId" | "alertType" | "occurrenceKey">>;
  entries: Array<{ item: AlertItem; key: Pick<SentAlertKey, "farmStageId" | "alertType" | "occurrenceKey"> }>;
}

interface OrderedAlert {
  item: AlertItem;
  key: PlannedRecipientAlerts["keys"][number];
  position: number;
}

/** Creates per-recipient alert batches without database, network, or wall-clock access. */
export function planDailyAlerts(input: DailyAlertPlanInput): PlannedRecipientAlerts[] {
  const plans: PlannedRecipientAlerts[] = [];

  for (const recipient of input.recipients) {
    if (!recipient.enabled) continue;
    const orderedAlerts: OrderedAlert[] = [];

    for (const farm of input.farms) {
      const stateByPosition = new Map(farm.stages.map((stage) => [stage.position, stage]));
      const farmStageIds = new Set(farm.stages.map((stage) => stage.farmStageId));
      const scheduled = computeSchedule(
        input.templates,
        input.windows,
        { plantingDate: farm.plantingDate, anchorDate: farm.anchorDate },
        farm.stages.map(({ position, isDone, doneDate, dueDateOverride }) => ({ position, isDone, doneDate, dueDateOverride })),
      );
      const alreadySent = new Set(
        input.sent
          .filter((sent) => sent.recipientId === recipient.id && farmStageIds.has(sent.farmStageId))
          .map((sent) => sent.occurrenceKey),
      );
      const dueAlerts = getDueAlerts(scheduled, input.today, input.settings, alreadySent);

      for (const dueAlert of dueAlerts) {
        const stage = scheduled.find((candidate) => candidate.position === dueAlert.position);
        const state = stateByPosition.get(dueAlert.position);
        if (!stage || !state || stage.kind === "unscheduled") continue;

        const dueDate = stage.kind === "date" ? stage.dueDate! : stage.windowStart!;
        const closingDate = stage.kind === "date" ? stage.dueDate! : stage.windowEnd!;
        const days = dueAlert.type === "window_open"
          ? dueAlert.days ?? diffInDays(input.today, stage.windowEnd!)
          : dueAlert.type === "overdue"
            ? diffInDays(closingDate, input.today)
            : diffInDays(input.today, dueDate);
        const item: AlertItem = {
          type: dueAlert.type,
          farmId: farm.id,
          farmName: farm.name,
          stageName: stage.name,
          kind: stage.kind,
          date: dueDate,
          ...(stage.kind === "window" ? { windowEnd: stage.windowEnd! } : {}),
          days,
        };
        orderedAlerts.push({
          item,
          key: { farmStageId: state.farmStageId, alertType: dueAlert.type, occurrenceKey: dueAlert.occurrenceKey },
          position: stage.position,
        });
      }
    }

    orderedAlerts.sort((a, b) => a.item.farmName.localeCompare(b.item.farmName) || a.position - b.position);
    if (orderedAlerts.length) {
      plans.push({
        recipientId: recipient.id,
        items: orderedAlerts.map(({ item }) => item),
        keys: orderedAlerts.map(({ key }) => key),
        entries: orderedAlerts.map(({ item, key }) => ({ item, key })),
      });
    }
  }

  return plans;
}
