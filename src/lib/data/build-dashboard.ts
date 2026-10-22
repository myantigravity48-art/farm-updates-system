import {
  compare,
  getStatus,
  parse,
  type CalendarDate,
  type ScheduledStage,
  type SeasonWindow,
} from "@/lib/schedule";
import { dateStagePhrase, windowStagePhrase } from "@/lib/format/day-phrases";
import { aggregateFarmStatus } from "./build-summary";
import { buildSeasonTimeline, type SeasonTimeline } from "./timeline";
import type { FarmStatus } from "./types";

const ATTENTION_ROWS = 8;
const COMING_UP_ROWS = 4;

export interface DashboardStageInput {
  position: number;
  name: string;
  kind: "window" | "date" | "unscheduled";
  isDone: boolean;
  /** Null when a stage was marked done without a date, for example at onboarding. */
  doneDate: CalendarDate | null;
  /** The due date, or the window opening for a window stage. */
  dueDate: CalendarDate | null;
  /** The window closing date, null otherwise. */
  windowEnd: CalendarDate | null;
}

export interface DashboardFarmInput {
  id: string;
  name: string;
  stages: DashboardStageInput[];
}

export interface DashboardRequest {
  farms: DashboardFarmInput[];
  headsUpDays: number;
  windows: SeasonWindow[];
}

export interface DashboardKpis {
  /** Stages across every farm with status overdue. */
  overdue: number;
  /** Stages with status due soon, which includes any currently open season window. */
  dueSoon: number;
  /** Stages done, with a done date in the current London calendar month. */
  doneThisMonth: number;
  farms: number;
}

export interface AttentionRow {
  farmId: string;
  farmName: string;
  stageName: string;
  status: Extract<FarmStatus, "overdue" | "due-soon">;
  phrase: string;
}

export interface AttentionList {
  rows: AttentionRow[];
  /** Rows beyond the 8-row cap, shown on the Dashboard as "+ N more". */
  extraCount: number;
  total: number;
}

export interface ProgressRow {
  id: string;
  name: string;
  doneCount: number;
  totalStages: number;
  status: FarmStatus;
}

export interface ProgressList {
  rows: ProgressRow[];
  total: number;
}

export interface ComingUpRow {
  farmId: string;
  farmName: string;
  stageName: string;
  /** The due date, or the window opening for a window stage. */
  date: CalendarDate;
}

export interface DashboardModel {
  kpis: DashboardKpis;
  attention: AttentionList;
  progress: ProgressList;
  comingUp: ComingUpRow[];
  timeline: SeasonTimeline;
}

const PROGRESS_RANK: Record<FarmStatus, number> = {
  overdue: 0,
  "due-soon": 1,
  "on-track": 2,
  done: 3,
};

/** True when both dates fall in the same London calendar month and year. */
function isSameLondonMonth(date: CalendarDate, today: CalendarDate): boolean {
  const left = parse(date);
  const right = parse(today);
  return (
    left.getUTCFullYear() === right.getUTCFullYear() &&
    left.getUTCMonth() === right.getUTCMonth()
  );
}

function toScheduledStage(stage: DashboardStageInput): ScheduledStage {
  const scheduled: ScheduledStage = {
    position: stage.position,
    name: stage.name,
    kind: stage.kind,
    isDone: stage.isDone,
    doneDate: stage.doneDate,
  };

  if (stage.kind === "date") scheduled.dueDate = stage.dueDate ?? undefined;
  if (stage.kind === "window") {
    scheduled.windowStart = stage.dueDate ?? undefined;
    scheduled.windowEnd = stage.windowEnd ?? undefined;
  }

  return scheduled;
}

/**
 * Builds the whole Dashboard from farm snapshots and today's London date.
 * Pure: no database, no network, no new Date().
 */
export function buildDashboard(input: DashboardRequest, today: CalendarDate): DashboardModel {
  const kpis: DashboardKpis = {
    overdue: 0,
    dueSoon: 0,
    doneThisMonth: 0,
    farms: input.farms.length,
  };

  const attention: Array<
    AttentionRow & { sortDate: CalendarDate; rank: number }
  > = [];
  const comingUpCandidates: Array<ComingUpRow & { position: number }> = [];
  const progressCandidates: ProgressRow[] = [];

  for (const farm of input.farms) {
    const summaryStages = farm.stages.map((stage) => {
      const status = getStatus(toScheduledStage(stage), today, input.headsUpDays);

      if (status === "overdue") kpis.overdue += 1;
      if (status === "due_soon") kpis.dueSoon += 1;
      if (stage.isDone && stage.doneDate && isSameLondonMonth(stage.doneDate, today)) {
        kpis.doneThisMonth += 1;
      }

      if (status === "overdue" || status === "due_soon") {
        // Overdue windows are late from their closing day; date stages from their due date.
        const lateDate = stage.kind === "window" ? stage.windowEnd : stage.dueDate;
        const sortDate: CalendarDate | null = status === "overdue" ? lateDate : stage.dueDate;

        if (sortDate && stage.dueDate) {
          attention.push({
            farmId: farm.id,
            farmName: farm.name,
            stageName: stage.name,
            status: status === "overdue" ? "overdue" : "due-soon",
            phrase:
              stage.kind === "window" && stage.windowEnd
                ? windowStagePhrase(today, stage.dueDate, stage.windowEnd)
                : dateStagePhrase(today, stage.dueDate),
            sortDate,
            rank: status === "overdue" ? 0 : 1,
          });
        }
      }

      if (status === "on_track" && stage.dueDate) {
        comingUpCandidates.push({
          farmId: farm.id,
          farmName: farm.name,
          stageName: stage.name,
          date: stage.dueDate,
          position: stage.position,
        });
      }

      return { position: stage.position, name: stage.name, isDone: stage.isDone, status, dueDate: stage.dueDate };
    });

    progressCandidates.push({
      id: farm.id,
      name: farm.name,
      doneCount: summaryStages.filter((stage) => stage.isDone).length,
      totalStages: farm.stages.length,
      status: aggregateFarmStatus(summaryStages),
    });
  }

  // Overdue first, most days late first; then due soon by date, earliest first.
  const attentionSorted = attention.sort(
    (left, right) =>
      left.rank - right.rank ||
      compare(left.sortDate, right.sortDate) ||
      left.farmName.localeCompare(right.farmName, "en-GB") ||
      left.stageName.localeCompare(right.stageName, "en-GB"),
  );

  const comingUp = comingUpCandidates
    .sort(
      (left, right) =>
        compare(left.date, right.date) ||
        left.position - right.position ||
        left.farmName.localeCompare(right.farmName, "en-GB"),
    )
    .slice(0, COMING_UP_ROWS)
    .map((candidate) => ({
      farmId: candidate.farmId,
      farmName: candidate.farmName,
      stageName: candidate.stageName,
      date: candidate.date,
    }));

  const progress = progressCandidates.sort(
    (left, right) =>
      PROGRESS_RANK[left.status] - PROGRESS_RANK[right.status] ||
      left.name.localeCompare(right.name, "en-GB"),
  );

  return {
    kpis,
    attention: {
      rows: attentionSorted.slice(0, ATTENTION_ROWS),
      extraCount: Math.max(0, attentionSorted.length - ATTENTION_ROWS),
      total: attentionSorted.length,
    },
    progress: { rows: progress.slice(0, ATTENTION_ROWS), total: progress.length },
    comingUp,
    timeline: buildSeasonTimeline(input.windows, today),
  };
}
