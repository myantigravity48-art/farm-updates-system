import { computeSchedule, type ScheduledStage } from "@/lib/schedule";
import { buildDashboard, type DashboardModel, type DashboardStageInput } from "./build-dashboard";
import { loadFarmCore } from "./farms";
import { mapFarmInput, mapStageStates, mapTemplates } from "./map-rows";

function toStageInput(stage: ScheduledStage): DashboardStageInput {
  return {
    position: stage.position,
    name: stage.name,
    kind: stage.kind,
    isDone: stage.isDone,
    doneDate: stage.doneDate,
    dueDate: stage.dueDate ?? stage.windowStart ?? null,
    windowEnd: stage.windowEnd ?? null,
  };
}

/**
 * Loads the whole Dashboard in a fixed number of parallel queries (the same
 * loaders and row mapper as getFarmSummaries), with no per-farm queries.
 * Today's London date comes from loadFarmCore's call to todayInLondon(new Date()).
 */
export async function getDashboardData(): Promise<DashboardModel> {
  const core = await loadFarmCore();

  const farms = core.farmRows
    .map((farmRow) => ({
      id: farmRow.id,
      name: farmRow.name,
      stages: computeSchedule(
        mapTemplates(core.templateRows),
        core.windows,
        mapFarmInput(farmRow),
        mapStageStates(core.stagesByFarm.get(farmRow.id) ?? [], core.templateRows),
      ).map(toStageInput),
    }))
    .sort((left, right) => left.name.localeCompare(right.name, "en-GB"));

  return buildDashboard(
    { farms, windows: core.windows, headsUpDays: core.headsUpDays },
    core.today,
  );
}
