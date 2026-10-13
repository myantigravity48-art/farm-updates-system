import type { AlertSettings, SeasonWindow, StageTemplate } from "./types";

// These are placeholders pending the owner's corrected timings. The engine never imports this file; callers pass the data in.
export const defaultStageTemplates: StageTemplate[] = [
  { position: 1, name: "Land clearing (cut trees, gather weeds, isolate wood, burn weeds, clear log remnants)", triggerType: "season_window", windowKey: "dry_season" },
  { position: 2, name: "Planting (acquire and plant seedlings)", triggerType: "season_window", windowKey: "planting" },
  { position: 3, name: "First round-weeding", triggerType: "after_planting", offsetMonths: 3 },
  { position: 4, name: "Herbicide on surrounding weeds", triggerType: "after_planting", offsetMonths: 3 },
  { position: 5, name: "First fertilizer", triggerType: "after_planting", offsetMonths: 4 },
  { position: 6, name: "Second round-weeding", triggerType: "after_planting", offsetMonths: 7 },
  { position: 7, name: "Third round-weeding", triggerType: "after_planting", offsetMonths: 11 },
  { position: 8, name: "Second fertilizer", triggerType: "after_planting", offsetMonths: 12 },
];
export const defaultSeasonWindows: SeasonWindow[] = [
  { key: "dry_season", startMonth: 11, startDay: 1, endMonth: 3, endDay: 31 },
  { key: "planting", startMonth: 4, startDay: 25, endMonth: 7, endDay: 15 },
];
export const defaultAlertSettings: AlertSettings = { headsUpDays: 14, reminderDays: 3, overdueEnabled: true, overdueRepeatDays: 3 };
