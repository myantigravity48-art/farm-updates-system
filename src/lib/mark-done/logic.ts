import {
  compare,
  computeSchedule,
  type CalendarDate,
  type FarmInput,
  type SeasonWindow,
  type StageState,
  type StageTemplate,
} from "@/lib/schedule";
import { formatUkShortDate } from "@/lib/format/dates";
import { parseCalendarDate } from "@/lib/farms/validate";

export interface DoneStageInput {
  triggerType: "season_window" | "after_planting";
}

export interface ValidateDoneInput {
  date: string;
  note: string;
  today: CalendarDate;
  stage: DoneStageInput;
  plantingDate: CalendarDate | null;
}

export interface MarkDonePreviewInputs {
  templates: StageTemplate[];
  windows: SeasonWindow[];
  farm: FarmInput;
  stages: StageState[];
  stagePosition: number;
}

export interface ActionableStage {
  position: number;
  name: string;
  isDone: boolean;
  windowKey?: string;
  hasOverride?: boolean;
}

export function validateDateInput(dateValue: string, today: CalendarDate): string | null {
  const date = parseCalendarDate(dateValue);
  if (!date) return "Enter a valid date.";
  if (compare(date, "2000-01-01") < 0) return "Choose a date from 1 January 2000 onward.";
  if (compare(date, today) > 0) return "The date can't be in the future.";
  return null;
}

export function validateOverrideInput(dateValue: string | null): string | null {
  if (dateValue === null) return null;
  const date = parseCalendarDate(dateValue);
  if (!date || compare(date, "2020-01-01") < 0 || compare(date, "2100-12-31") > 0) {
    return "Choose a valid date between 1 January 2020 and 31 December 2100.";
  }
  return null;
}

export type StageAction =
  | "mark_done"
  | "set_date_manually"
  | "use_schedule_date"
  | "mark_not_done"
  | "change_planting_date";

export function validateDoneInput(input: ValidateDoneInput): string | null {
  const date = parseCalendarDate(input.date);
  if (!input.date.trim()) return "Choose the date this stage was done.";
  if (!date) return "Enter a valid date.";
  if (compare(date, "2000-01-01") < 0) return "Choose a date from 1 January 2000 onward.";
  if (compare(date, input.today) > 0) return "The date can't be in the future.";
  if (
    input.stage.triggerType === "after_planting" &&
    input.plantingDate &&
    compare(date, input.plantingDate) < 0
  ) {
    return `This job can't be done before planting. Planting date: ${formatUkShortDate(input.plantingDate)}.`;
  }
  if (input.note.length > 1000) return "Keep the note to 1000 characters or fewer.";
  return null;
}

export function previewAfterDone(
  inputs: MarkDonePreviewInputs,
  doneDate: CalendarDate,
): string {
  const target = inputs.templates.find((template) => template.position === inputs.stagePosition);
  const stages = inputs.stages.map((stage) =>
    stage.position === inputs.stagePosition
      ? { ...stage, isDone: true, doneDate }
      : stage,
  );
  const plantingDate = target?.windowKey === "planting" ? doneDate : inputs.farm.plantingDate;
  const scheduled = computeSchedule(
    inputs.templates,
    inputs.windows,
    { ...inputs.farm, plantingDate },
    stages,
  );
  const next = scheduled.find((stage) => !stage.isDone);

  if (!next) return "This completes every stage for this farm.";
  if (next.kind === "unscheduled" || (!next.dueDate && !next.windowStart)) {
    return `Next: ${next.name}, date set once planting is done.`;
  }
  if (next.kind === "window" && next.windowStart && next.windowEnd) {
    return `Next: ${next.name}, opens ${formatUkShortDate(next.windowStart)} and closes ${formatUkShortDate(next.windowEnd)}.`;
  }
  return `Next: ${next.name}, due ${formatUkShortDate(next.dueDate ?? next.windowStart!)}.`;
}

export function earlierStagesOpen(
  stages: Array<{ position: number; name: string; isDone: boolean }>,
  position: number,
): string[] {
  return stages
    .filter((stage) => stage.position < position && !stage.isDone)
    .sort((left, right) => left.position - right.position)
    .map((stage) => stage.name);
}

export function availableActions(stage: ActionableStage): StageAction[] {
  if (stage.isDone) {
    return stage.windowKey === "planting" ? ["mark_not_done", "change_planting_date"] : ["mark_not_done"];
  }
  return [
    "mark_done",
    "set_date_manually",
    ...(stage.hasOverride ? (["use_schedule_date"] as const) : []),
  ];
}

export type StageActionErrorCode =
  | "already_done"
  | "not_found"
  | "future_date"
  | "invalid_date"
  | "invalid_note"
  | "before_planting"
  | "not_done"
  | "later_stages_done"
  | "planting_not_done";

export function stageActionErrorMessage(
  code: string | null | undefined,
  plantingDate?: CalendarDate | null,
): string {
  switch (code) {
    case "already_done":
      return "Someone already marked this done. Refresh the page.";
    case "not_found":
      return "This stage could not be found. Refresh the page.";
    case "future_date":
      return "The date can't be in the future.";
    case "invalid_date":
      return "Enter a valid date in the supported range.";
    case "invalid_note":
      return "Keep the note to 1000 characters or fewer.";
    case "before_planting":
      return plantingDate
        ? `This job can't be done before planting. Planting date: ${formatUkShortDate(plantingDate)}.`
        : "This job can't be done before planting. Set the planting date first.";
    case "not_done":
      return "This stage is already not done. Refresh the page.";
    case "later_stages_done":
      return "Mark the later stages as not done first.";
    case "planting_not_done":
      return "Mark planting done first.";
    default:
      return "Something went wrong. Try again.";
  }
}
