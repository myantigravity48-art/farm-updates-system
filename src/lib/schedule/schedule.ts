import { addDays, addMonths } from "./dates";
import { resolveWindow } from "./windows";
import type { FarmInput, ScheduledStage, SeasonWindow, StageState, StageTemplate } from "./types";

/** Derives all stage windows and due dates from editable data and farm state. */
export function computeSchedule(templates: StageTemplate[], windows: SeasonWindow[], farm: FarmInput, stages: StageState[]): ScheduledStage[] {
  const stateByPosition = new Map(stages.map((stage) => [stage.position, stage]));
  const plantingTemplate = templates.find((template) => template.windowKey === "planting");
  const plantingState = plantingTemplate ? stateByPosition.get(plantingTemplate.position) : undefined;
  const plantingDate = farm.plantingDate ?? plantingState?.doneDate ?? null;
  const clearingTemplate = templates.find((template) => template.windowKey === "dry_season");
  const clearingState = clearingTemplate ? stateByPosition.get(clearingTemplate.position) : undefined;

  return templates.map((template): ScheduledStage => {
    const state = stateByPosition.get(template.position) ?? { position: template.position, isDone: false, doneDate: null, dueDateOverride: null };
    const base = { position: template.position, name: template.name, isDone: state.isDone, doneDate: state.doneDate };
    if (state.dueDateOverride) return { ...base, kind: "date", dueDate: state.dueDateOverride };
    if (template.triggerType === "after_planting") {
      return plantingDate ? { ...base, kind: "date", dueDate: addMonths(plantingDate, template.offsetMonths ?? 0) } : { ...base, kind: "unscheduled", unscheduledReason: "needs_planting_date" };
    }
    if (template.triggerType === "after_stage_done") {
      const anchorTemplate = templates.find((candidate) => candidate.windowKey === template.anchorWindowKey);
      const anchorState = anchorTemplate ? stateByPosition.get(anchorTemplate.position) : undefined;
      const anchorName = anchorTemplate?.name;
      if (state.dueDateOverride) return { ...base, kind: "date", dueDate: state.dueDateOverride, waitingForStage: anchorName };
      if (anchorState?.isDone && anchorState.doneDate) return { ...base, kind: "date", dueDate: addDays(anchorState.doneDate, template.offsetDays ?? 0), waitingForStage: anchorName };
      return { ...base, kind: "unscheduled", unscheduledReason: "needs_anchor_stage", waitingForStage: anchorName };
    }
    const window = windows.find((candidate) => candidate.key === template.windowKey);
    if (!window) throw new Error(`Missing season window: ${template.windowKey}`);
    const anchor = template.windowKey === "planting" ? clearingState?.doneDate ?? farm.anchorDate : farm.anchorDate;
    const occurrence = resolveWindow(window, anchor);
    return { ...base, kind: "window", windowStart: occurrence.start, windowEnd: occurrence.end };
  });
}
