import type { AlertSettings, SeasonWindow, StageTemplate } from "./types";

// These are placeholders pending the owner's corrected timings. The engine never imports this file; callers pass the data in.
export const defaultStageTemplates: StageTemplate[] = [
  { position: 1, name: "Land clearing", triggerType: "season_window", windowKey: "dry_season" },
  { position: 2, name: "Order seedlings", triggerType: "after_stage_done", anchorWindowKey: "dry_season", offsetDays: 0 },
  { position: 3, name: "Planting", triggerType: "season_window", windowKey: "planting" },
  { position: 4, name: "First round-weeding", triggerType: "after_planting", offsetMonths: 3 },
  { position: 5, name: "Herbicide", triggerType: "after_planting", offsetMonths: 3 },
  { position: 6, name: "First fertilizer", triggerType: "after_planting", offsetMonths: 4 },
  { position: 7, name: "Second round-weeding", triggerType: "after_planting", offsetMonths: 7 },
  { position: 8, name: "Third round-weeding", triggerType: "after_planting", offsetMonths: 11 },
  { position: 9, name: "Second fertilizer", triggerType: "after_planting", offsetMonths: 12 },
];
export const defaultSeasonWindows: SeasonWindow[] = [
  { key: "dry_season", startMonth: 11, startDay: 1, endMonth: 3, endDay: 31 },
  { key: "planting", startMonth: 4, startDay: 25, endMonth: 7, endDay: 15 },
];
export const defaultAlertSettings: AlertSettings = { headsUpDays: 14, reminderDays: 3, overdueEnabled: true, overdueRepeatDays: 7, windowNudgeDays: 14 };
