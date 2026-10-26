import { getStatus, type CalendarDate, type ScheduledStage, type StageTemplate, type Status } from "@/lib/schedule";
import { dateStagePhrase, windowStagePhrase } from "@/lib/format/day-phrases";
import { formatUkDate } from "@/lib/format/dates";

/** One template, its derived schedule, and the stored override flag. */
export interface StageRowInput {
  template: StageTemplate;
  scheduled: ScheduledStage;
  dueDateOverride: CalendarDate | null;
}

/** A read-only row for the Farm detail stage timeline. */
export interface StageRow {
  position: number;
  name: string;
  ruleText: string;
  dateText: string;
  state: Status;
  /** The pill label for this state, never shown by colour alone. */
  pillLabel: string;
  /** True for the first stage that is not done. */
  nextUp: boolean;
}

export const STATUS_LABELS: Record<Status, string> = {
  done: "Done",
  unscheduled: "Unscheduled",
  on_track: "On track",
  due_soon: "Due soon",
  overdue: "Overdue",
};

const WINDOW_LABELS: Record<string, string> = {
  dry_season: "Dry season",
  planting: "Planting",
};

/** Turns a window key into a readable phrase, for example "dry_season" to "Dry season". */
function windowLabel(key: string | undefined): string {
  if (!key) return "Season";
  const known = WINDOW_LABELS[key];
  if (known) return known;
  const words = key.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * The rule text always comes from the stage template, never from a position
 * literal, so edited templates change the timeline without code changes.
 */
export function stageRuleText(template: StageTemplate): string {
  if (template.triggerType === "season_window") {
    return `${windowLabel(template.windowKey)} window`;
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
    return "Date set once planting is done";
  }

  const parts: string[] = [];

  if (stage.kind === "window" && stage.windowStart && stage.windowEnd) {
    parts.push(
      `Opens ${formatUkDate(stage.windowStart)}, closes ${formatUkDate(stage.windowEnd)}`,
    );
    parts.push(windowStagePhrase(today, stage.windowStart, stage.windowEnd));
  } else if (stage.dueDate) {
    parts.push(`Due ${formatUkDate(stage.dueDate)}`);
    parts.push(dateStagePhrase(today, stage.dueDate));
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
      position: input.template.position,
      name: input.template.name,
      ruleText: stageRuleText(input.template),
      dateText: buildDateText(input, today, state),
      state,
      pillLabel: STATUS_LABELS[state],
      nextUp,
    };
  });

  return rows;
}
