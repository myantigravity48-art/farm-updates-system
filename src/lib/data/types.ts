import type { CalendarDate } from "@/lib/schedule";
import type { StageRow } from "./build-stage-rows";

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
  triggerType?: "season_window" | "after_planting" | "after_stage_done";
  anchorWindowKey?: "dry_season" | "planting";
  offsetDays?: number;
}

export interface StageConfig {
  stages: StageOption[];
  /** Position of the stage whose window_key is "planting". */
  plantingPosition: number;
}

/** A note shown on the Farm detail page. */
export interface FarmNote {
  id: string;
  body: string;
  authorName: string | null;
  /** ISO timestamp. Formatted in Europe/London at render time. */
  createdAt: string;
  stageId: string | null;
  stageName: string | null;
}

/** A photo shown on the Farm detail page, with a server-signed URL. */
export interface FarmPhoto {
  id: string;
  caption: string | null;
  takenOn: CalendarDate | null;
  authorName: string | null;
  stageName: string | null;
  /** Null when the signed URL could not be created; the tile shows a placeholder. */
  url: string | null;
}

export interface FarmStageOption {
  id: string;
  position: number;
  name: string;
}

/** Everything the Farm detail page renders. */
export interface FarmDetailView {
  id: string;
  name: string;
  location: string | null;
  sizeLabel: string | null;
  sizeValue: number | null;
  sizeUnit: string | null;
  /** The farm's own notes field, used by the Edit farm dialog. */
  farmNotes: string | null;
  status: FarmStatus;
  doneCount: number;
  totalStages: number;
  plantingDate: CalendarDate | null;
  /** Today in Europe/London, computed on the server for the forms and the engine. */
  today: CalendarDate;
  stages: StageRow[];
  stageOptions: FarmStageOption[];
  notes: FarmNote[];
  photos: FarmPhoto[];
}
