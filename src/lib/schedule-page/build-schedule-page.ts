import {
  addDays,
  compare,
  diffInDays,
  getStatus,
  parse,
  type CalendarDate,
  type ScheduledStage,
  type Status,
} from "@/lib/schedule";
import { dateStagePhrase, windowStagePhrase } from "@/lib/format/day-phrases";
import { formatUkDate } from "@/lib/format/dates";

export type ScheduleFilterStatus = "all" | "overdue" | "due-soon" | "upcoming";

export interface ScheduleFilters {
  farmId: string | null;
  status: ScheduleFilterStatus;
  showCompleted: boolean;
}

export interface ScheduleFarmInput {
  id: string;
  name: string;
  stages: Array<{
    id: string | null;
    scheduled: ScheduledStage;
    dueDateOverride: CalendarDate | null;
    doneByName: string | null;
  }>;
}

export interface SchedulePageInput {
  farms: ScheduleFarmInput[];
  headsUpDays: number;
}

export interface SchedulePageRow {
  farmId: string;
  farmName: string;
  farmStageId: string | null;
  position: number;
  stageName: string;
  status: Status;
  dateText: string;
  phrase: string;
  isOverrideDate: boolean;
  canMarkDone: boolean;
}

export interface SchedulePageGroup {
  label: string;
  count: number;
  rows: SchedulePageRow[];
  collapsed?: boolean;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DEFAULT_FILTERS: ScheduleFilters = { farmId: null, status: "all", showCompleted: false };

function scalar(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/** Parses URL filters defensively; repeated and unknown values fall back to defaults. */
export function parseScheduleFilters(
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>,
): ScheduleFilters {
  const read = (key: string): string | undefined =>
    searchParams instanceof URLSearchParams
      ? (searchParams.getAll(key).length === 1 ? searchParams.get(key) ?? undefined : undefined)
      : scalar(searchParams[key]);
  const farmId = read("farmId");
  const status = read("status");
  const showCompleted = read("showCompleted");

  return {
    farmId: farmId && UUID.test(farmId) ? farmId : DEFAULT_FILTERS.farmId,
    status: status === "overdue" || status === "due-soon" || status === "upcoming" ? status : "all",
    showCompleted: showCompleted === "true" ? true : DEFAULT_FILTERS.showCompleted,
  };
}

function groupRow(
  farm: ScheduleFarmInput,
  stage: ScheduleFarmInput["stages"][number],
  today: CalendarDate,
  headsUpDays: number,
): SchedulePageRow {
  const scheduled = stage.scheduled;
  const status = getStatus(scheduled, today, headsUpDays);
  let dateText = "";
  let phrase = "Unscheduled";

  if (scheduled.kind === "window" && scheduled.windowStart && scheduled.windowEnd) {
    dateText = `Opens ${formatUkDate(scheduled.windowStart)}, closes ${formatUkDate(scheduled.windowEnd)}`;
    phrase = windowStagePhrase(today, scheduled.windowStart, scheduled.windowEnd);
  } else if (scheduled.kind === "date" && scheduled.dueDate) {
    dateText = `Due ${formatUkDate(scheduled.dueDate)}`;
    phrase = dateStagePhrase(today, scheduled.dueDate);
  } else if (scheduled.kind === "unscheduled") {
    dateText = scheduled.unscheduledReason === "needs_anchor_stage"
      ? `Starts when ${scheduled.waitingForStage ?? "the anchor stage"} is marked done`
      : "Date set once planting is done";
  }

  return {
    farmId: farm.id,
    farmName: farm.name,
    farmStageId: stage.id,
    position: scheduled.position,
    stageName: scheduled.name,
    status,
    dateText,
    phrase,
    isOverrideDate: stage.dueDateOverride !== null,
    canMarkDone: !scheduled.isDone && status !== "unscheduled" && stage.id !== null,
  };
}

function targetDate(stage: ScheduledStage): CalendarDate | null {
  if (stage.kind === "date") return stage.dueDate ?? null;
  if (stage.kind === "window") return stage.windowStart ?? null;
  return null;
}

type SortableScheduleRow = SchedulePageRow & { sortDate: CalendarDate };

function laterDateSort(left: SortableScheduleRow, right: SortableScheduleRow): number {
  return compare(left.sortDate, right.sortDate) ||
    left.farmName.localeCompare(right.farmName, "en-GB") ||
    left.position - right.position;
}

function ordinarySort(left: SortableScheduleRow, right: SortableScheduleRow): number {
  return compare(left.sortDate, right.sortDate) ||
    left.farmName.localeCompare(right.farmName, "en-GB") ||
    left.position - right.position;
}

function matchesStatus(status: Status, filter: ScheduleFilterStatus): boolean {
  if (filter === "all") return true;
  if (filter === "overdue") return status === "overdue";
  if (filter === "due-soon") return status === "due_soon";
  return status === "on_track";
}

function monthLabel(date: CalendarDate): string {
  const parsed = parse(date);
  return `${MONTHS[parsed.getUTCMonth()]} ${parsed.getUTCFullYear()}`;
}

/** Builds sorted, filterable schedule groups from snapshots; no I/O or clock access. */
export function buildSchedulePage(
  input: SchedulePageInput,
  today: CalendarDate,
  filters: ScheduleFilters = DEFAULT_FILTERS,
): SchedulePageGroup[] {
  const overdue: Array<SchedulePageRow & { sortDate: CalendarDate }> = [];
  const openNow: Array<SchedulePageRow & { sortDate: CalendarDate }> = [];
  const next14: Array<SchedulePageRow & { sortDate: CalendarDate }> = [];
  const months = new Map<string, Array<SchedulePageRow & { sortDate: CalendarDate }>>();
  const unscheduled: SchedulePageRow[] = [];
  const completed: Array<SchedulePageRow & { doneDate: CalendarDate }> = [];
  const rangeEnd = addDays(today, 14);
  const completedStart = addDays(today, -60);

  for (const farm of input.farms) {
    if (filters.farmId && filters.farmId !== farm.id) continue;
    for (const stage of farm.stages) {
      const scheduled = stage.scheduled;
      if (scheduled.isDone) {
        if (filters.showCompleted && scheduled.doneDate && compare(scheduled.doneDate, completedStart) >= 0 && compare(scheduled.doneDate, today) <= 0) {
          const row = groupRow(farm, stage, today, input.headsUpDays);
          row.status = "done";
          row.phrase = `Done ${formatUkDate(scheduled.doneDate)}${stage.doneByName ? ` by ${stage.doneByName}` : ""}`;
          row.dateText = row.phrase;
          completed.push({ ...row, doneDate: scheduled.doneDate });
        }
        continue;
      }

      const row = groupRow(farm, stage, today, input.headsUpDays);
      if (scheduled.kind === "unscheduled") {
        if (filters.status === "all") unscheduled.push(row);
        continue;
      }
      if (!matchesStatus(row.status, filters.status)) continue;
      const date = targetDate(scheduled);
      if (!date) continue;

      if (row.status === "overdue") {
        const lateDate = scheduled.kind === "window" ? scheduled.windowEnd! : date;
        overdue.push({ ...row, sortDate: lateDate });
      } else if (scheduled.kind === "window" && compare(scheduled.windowStart!, today) <= 0 && compare(today, scheduled.windowEnd!) <= 0) {
        openNow.push({ ...row, sortDate: scheduled.windowEnd! });
      } else if (compare(date, rangeEnd) <= 0) {
        next14.push({ ...row, sortDate: date });
      } else {
        const label = monthLabel(date);
        const group = months.get(label) ?? [];
        group.push({ ...row, sortDate: date });
        months.set(label, group);
      }
    }
  }

  overdue.sort((a, b) => diffInDays(b.sortDate, a.sortDate) || a.farmName.localeCompare(b.farmName, "en-GB") || a.position - b.position);
  openNow.sort(laterDateSort);
  next14.sort(ordinarySort);
  completed.sort((a, b) => compare(b.doneDate, a.doneDate) || a.farmName.localeCompare(b.farmName, "en-GB") || a.position - b.position);
  unscheduled.sort((a, b) => a.farmName.localeCompare(b.farmName, "en-GB") || a.position - b.position);

  const groups: SchedulePageGroup[] = [];
  const add = (label: string, rows: SchedulePageRow[], collapsed = false) => {
    if (rows.length) groups.push({ label, count: rows.length, rows, ...(collapsed ? { collapsed: true } : {}) });
  };
  add("Overdue", overdue);
  add("Open now", openNow);
  add("Next 14 days", next14);
  const sortedMonths = [...months.entries()].sort(([left], [right]) => {
    const a = months.get(left)![0].sortDate!;
    const b = months.get(right)![0].sortDate!;
    return compare(a, b);
  });
  for (const [label, rows] of sortedMonths) {
    rows.sort(ordinarySort);
    add(label, rows);
  }
  add("Not scheduled yet", unscheduled, true);
  add("Recently completed", completed);
  return groups;
}
