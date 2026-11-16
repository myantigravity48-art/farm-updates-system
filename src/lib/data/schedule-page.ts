import { computeSchedule } from "@/lib/schedule";
import { loadFarmCore } from "./farms";
import { mapFarmInput, mapStageStates, mapTemplates } from "./map-rows";
import type { SchedulePageInput } from "@/lib/schedule-page/build-schedule-page";

/** Loads one shared farm snapshot for every row, with no per-farm queries. */
export async function getSchedulePageData(): Promise<SchedulePageInput> {
  const core = await loadFarmCore();
  const templates = mapTemplates(core.templateRows);

  return {
    headsUpDays: core.headsUpDays,
    farms: core.farmRows.map((farmRow) => {
      const stageRows = core.stagesByFarm.get(farmRow.id) ?? [];
      const states = mapStageStates(stageRows, core.templateRows);
      const stateByPosition = new Map(states.map((state) => [state.position, state] as const));
      const stageRowByPosition = new Map(
        stageRows.flatMap((row) => {
          const position = core.templateRows.find((template) => template.id === row.template_id)?.position;
          return position === undefined ? [] : [[position, row] as const];
        }),
      );
      const scheduled = computeSchedule(templates, core.windows, mapFarmInput(farmRow), states);

      return {
        id: farmRow.id,
        name: farmRow.name,
        stages: scheduled.map((stage) => {
          const position = stage.position;
          const stageRow = stageRowByPosition.get(position);
          return {
            id: stageRow?.id ?? null,
            scheduled: stage,
            dueDateOverride: stateByPosition.get(position)?.dueDateOverride ?? null,
            doneByName: stageRow?.done_by_name ?? null,
          };
        }),
      };
    }).sort((left, right) => left.name.localeCompare(right.name, "en-GB")),
  };
}
