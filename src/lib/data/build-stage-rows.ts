import { getStatus, type CalendarDate, type ScheduledStage, type StageTemplate, type Status } from "@/lib/schedule";
import { dateStagePhrase, windowStagePhrase } from "@/lib/format/day-phrases";
import { formatUkDate } from "@/lib/format/dates";

/** One template, its derived schedule, and the stored override flag. */
export interface StageRowInput {
  template: StageTemplate;
  scheduled: ScheduledStage;
  dueDateOverride: CalendarDate | null;
  id?: string;
  doneByName?: string | null;
  doneNote?: string | null;
}

/** A read-only row for the Farm detail stage timeline. */
export interface StageRow {
  id: string | null;
  position: number;
  name: string;
  ruleText: string;
  dateText: string;
  state: Status;
  /** The pill label for this state, never shown by colour alone. */
  pillLabel: string;
  /** True for the first stage that is not done. */
  nextUp: boolean;
  doneByName: string | null;
  doneNote: string | null;
  doneDate: CalendarDate | null;
  dueDate: CalendarDate | null;
  dueDateOverride: CalendarDate | null;
  windowKey?: string;
}

export const STATUS_LABELS: Record<Status, string> = {
  done: "Done",
  unscheduled: "Unscheduled",
  on_track: "On track",
  due_soon: "Due soon",
  overdue: "Overdue",
};

/** Turns a window key into a readable phrase, for example "dry_season" to "Dry season". */
function windowLabel(key: string | undefined): string {
  if (!key) return "Season";
  const words = key.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * The rule text always comes from the stage template, never from a position
 * literal, so edited templates change the timeline without code changes.
 */
export function stageRuleText(template: StageTemplate, anchorName?: string): string {
  if (template.triggerType === "season_window") {
    return `${windowLabel(template.windowKey)} window`;
  }
  if (template.triggerType === "after_stage_done") {
    const anchor = anchorName ?? (template.anchorWindowKey === "dry_season" ? "Land clearing" : "Planting");
    return `Starts when ${anchor} is marked done`;
  }

  const months = template.offsetMonths ?? 0;
  return `${months} ${months === 1 ? "month" : "months"} after planting`;
}

function buildDateText(
  input: StageRowInput,
  today: CalendarDate,
  state: Status,
): string {
  const stage = input.scheduled;

  if (stage.isDone) {
    return stage.doneDate
      ? `Done ${formatUkDate(stage.doneDate)}`
      : "Done, date not recorded";
  }

  if (state === "unscheduled" || stage.kind === "unscheduled") {
    return stage.unscheduledReason === "needs_anchor_stage"
      ? `Starts when ${stage.waitingForStage ?? "the anchor stage"} is marked done`
      : "Date set once planting is done";
  }

  const parts: string[] = [];

  if (stage.kind === "window" && stage.windowStart && stage.windowEnd) {
    parts.push(
      `Opens ${formatUkDate(stage.windowStart)}, closes ${formatUkDate(stage.windowEnd)}`,
    );
    parts.push(windowStagePhrase(today, stage.windowStart, stage.windowEnd));
  } else if (stage.dueDate) {
    parts.push(`Due ${formatUkDate(stage.dueDate)}`);
    if (input.template.triggerType === "after_stage_done") parts.push(`Set from ${stage.waitingForStage ?? (input.template.anchorWindowKey === "dry_season" ? "Land clearing" : "Planting")} done date`);
    else parts.push(dateStagePhrase(today, stage.dueDate));
  }

  if (input.dueDateOverride) parts.push("Date set manually");

  return parts.join(" · ");
}

/**
 * Builds one read-only row per stage, ordered by position, with the first
 * stage that is not done marked "Next up". Pure: no database or clock access.
 */
export function buildStageRows(
  stages: StageRowInput[],
  today: CalendarDate,
  headsUpDays: number,
): StageRow[] {
  const ordered = [...stages].sort(
    (left, right) => left.template.position - right.template.position,
  );

  let nextUpPosition: number | null = null;
  const rows = ordered.map((input): StageRow => {
    const state = getStatus(input.scheduled, today, headsUpDays);
    const nextUp = nextUpPosition === null && !input.scheduled.isDone;

    if (nextUp) nextUpPosition = input.template.position;

    return {
      id: input.id ?? null,
      position: input.template.position,
      name: input.template.name,
      ruleText: stageRuleText(input.template, ordered.find((candidate) => candidate.template.windowKey === input.template.anchorWindowKey)?.template.name),
      dateText: buildDateText(input, today, state),
      state,
      pillLabel: STATUS_LABELS[state],
      nextUp,
      doneByName: input.doneByName ?? null,
      doneNote: input.doneNote ?? null,
      doneDate: input.scheduled.doneDate,
      dueDateOverride: input.dueDateOverride,
      dueDate: input.scheduled.dueDate ?? input.scheduled.windowStart ?? null,
      windowKey: input.template.windowKey,
    };
  });

  return rows;
}
