import { compare, type CalendarDate, type Status } from "@/lib/schedule";
import { formatDayCount, formatUkDate } from "@/lib/format/dates";
import type { FarmStatus, FarmSummary } from "./types";

export interface SummaryFarm {
  id: string;
  name: string;
  location: string | null;
  sizeValue: number | null;
  sizeUnit: string | null;
}

export interface SummaryStage {
  position: number;
  name: string;
  isDone: boolean;
  status: Status;
  /** The due date, or the window opening for a season-window stage. */
  dueDate: CalendarDate | null;
}

const sizeNumber = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 });

export function formatSizeLabel(sizeValue: number | null, sizeUnit: string | null): string | null {
  if (sizeValue === null || !sizeUnit) return null;
  return `${sizeNumber.format(sizeValue)} ${sizeUnit}`;
}

export function aggregateFarmStatus(stages: SummaryStage[]): FarmStatus {
  if (stages.length > 0 && stages.every((stage) => stage.isDone)) return "done";
  if (stages.some((stage) => stage.status === "overdue")) return "overdue";
  if (stages.some((stage) => stage.status === "due_soon")) return "due-soon";
  return "on-track";
}

export function buildFarmSummary(
  farm: SummaryFarm,
  stages: SummaryStage[],
  today: CalendarDate,
): FarmSummary {
  const ordered = [...stages].sort((left, right) => left.position - right.position);
  const doneCount = ordered.filter((stage) => stage.isDone).length;
  const currentStage = ordered.find((stage) => !stage.isDone) ?? null;

  const nextStage =
    ordered
      .filter((stage) => !stage.isDone && stage.dueDate !== null)
      .sort((left, right) => {
        const byDate = compare(left.dueDate!, right.dueDate!);
        return byDate !== 0 ? byDate : left.position - right.position;
      })[0] ?? null;

  return {
    id: farm.id,
    name: farm.name,
    location: farm.location,
    sizeLabel: formatSizeLabel(farm.sizeValue, farm.sizeUnit),
    status: aggregateFarmStatus(ordered),
    doneCount,
    totalStages: ordered.length,
    currentStageName: currentStage?.name ?? null,
    nextStageName: nextStage?.name ?? null,
    nextDueDate: nextStage?.dueDate ?? null,
    nextDueLabel: nextStage?.dueDate ? formatUkDate(nextStage.dueDate) : null,
    nextDueDayLabel:
      nextStage?.dueDate ? formatDayCount(today, nextStage.dueDate) : null,
  };
}
