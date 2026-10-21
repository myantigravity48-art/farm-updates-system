import type { CalendarDate } from "@/lib/schedule";

export type FarmStatus = "on-track" | "due-soon" | "overdue" | "done";

export interface FarmSummary {
  id: string;
  name: string;
  location: string | null;
  sizeLabel: string | null;
  status: FarmStatus;
  doneCount: number;
  totalStages: number;
  /** The first stage that is not done, or null when every stage is done. */
  currentStageName: string | null;
  /** The name of the stage with the next due date, or null when none is scheduled. */
  nextStageName: string | null;
  nextDueDate: CalendarDate | null;
  /** The formatted date, for example "Fri 23 Oct 2026". */
  nextDueLabel: string | null;
  /** The distance from today, for example "in 5 days" or "3 days late". */
  nextDueDayLabel: string | null;
}

export interface FarmDetail extends FarmSummary {
  notes: string | null;
  sizeValue: number | null;
  sizeUnit: string | null;
  plantingDate: CalendarDate | null;
  scheduleAnchorDate: CalendarDate;
}

export interface StageOption {
  position: number;
  name: string;
}

export interface StageConfig {
  stages: StageOption[];
  /** Position of the stage whose window_key is "planting". */
  plantingPosition: number;
}
