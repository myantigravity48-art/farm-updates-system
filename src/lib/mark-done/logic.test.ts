import { describe, expect, it } from "vitest";
import { defaultSeasonWindows, defaultStageTemplates } from "@/lib/schedule";
import {
  availableActions,
  earlierStagesOpen,
  previewAfterDone,
  stageActionErrorMessage,
  validateDoneInput,
} from "./logic";

const today = "2026-11-07" as const;
const base = {
  today,
  stage: { triggerType: "after_planting" as const },
  plantingDate: "2026-04-20" as const,
};

describe("validateDoneInput", () => {
  it("accepts today and empty notes", () => {
    expect(validateDoneInput({ ...base, date: today, note: "" })).toBeNull();
  });
  it("requires and validates a date", () => {
    expect(validateDoneInput({ ...base, date: "", note: "" })).toMatch(/Choose the date/);
    expect(validateDoneInput({ ...base, date: "2026-02-30", note: "" })).toBe("Enter a valid date.");
  });
  it("rejects future and too-early dates", () => {
    expect(validateDoneInput({ ...base, date: "2026-11-08", note: "" })).toBe("The date can't be in the future.");
    expect(validateDoneInput({ ...base, date: "1999-12-31", note: "" })).toMatch(/1 January 2000/);
  });
  it("rejects before planting only for after-planting stages", () => {
    expect(validateDoneInput({ ...base, date: "2026-04-19", note: "" })).toMatch(/before planting/);
    expect(validateDoneInput({ ...base, stage: { triggerType: "season_window" }, date: "2026-04-19", note: "" })).toBeNull();
  });
  it("rejects notes over 1000 characters", () => {
    expect(validateDoneInput({ ...base, date: today, note: "x".repeat(1001) })).toMatch(/1000 characters/);
  });
});

const previewBase = {
  templates: defaultStageTemplates,
  windows: defaultSeasonWindows,
  farm: { anchorDate: "2026-01-01" as const, plantingDate: null },
  stages: defaultStageTemplates.map((stage) => ({
    position: stage.position,
    isDone: false,
    doneDate: null,
    dueDateOverride: null,
  })),
};

describe("previewAfterDone", () => {
  it("shows a normal next stage", () => {
    expect(previewAfterDone({ ...previewBase, stagePosition: 1 }, today)).toContain("Next: Planting");
  });
  it("reports completion on the last stage", () => {
    const stages = previewBase.stages.map((stage) => ({ ...stage, isDone: stage.position < 8 }));
    expect(previewAfterDone({ ...previewBase, stages, stagePosition: 8 }, today)).toBe("This completes every stage for this farm.");
  });
  it("schedules later stages from the hypothetical planting date", () => {
    const stages = previewBase.stages.map((stage) => ({ ...stage, isDone: stage.position === 1 }));
    const result = previewAfterDone({ ...previewBase, stages, stagePosition: 2 }, "2026-06-15");
    expect(result).toContain("Next: First round-weeding");
    expect(result).toContain("15 Sept 2026");
  });
  it("keeps a later stage unscheduled without a planting date", () => {
    const stages = previewBase.stages.map((stage) => ({ ...stage, isDone: stage.position < 3 }));
    expect(previewAfterDone({ ...previewBase, stages, stagePosition: 3 }, today)).toBe("Next: Herbicide on surrounding weeds, date set once planting is done.");
  });
});

describe("earlierStagesOpen and availableActions", () => {
  it("returns earlier open stage names by position", () => {
    expect(earlierStagesOpen([
      { position: 2, name: "Planting", isDone: false },
      { position: 1, name: "Land clearing", isDone: false },
      { position: 3, name: "Weeding", isDone: false },
      { position: 0, name: "Old", isDone: true },
    ], 3)).toEqual(["Land clearing", "Planting"]);
  });
  it("returns actions for each row state", () => {
    expect(availableActions({ position: 1, name: "One", isDone: false })).toEqual(["mark_done", "set_date_manually"]);
    expect(availableActions({ position: 1, name: "One", isDone: false, hasOverride: true })).toEqual(["mark_done", "set_date_manually", "use_schedule_date"]);
    expect(availableActions({ position: 2, name: "Planting", isDone: true, windowKey: "planting" })).toEqual(["mark_not_done", "change_planting_date"]);
    expect(availableActions({ position: 1, name: "One", isDone: true })).toEqual(["mark_not_done"]);
  });
});

describe("stageActionErrorMessage", () => {
  it.each([
    ["already_done", "Someone already marked this done. Refresh the page."],
    ["not_found", "This stage could not be found. Refresh the page."],
    ["future_date", "The date can't be in the future."],
    ["invalid_date", "Enter a valid date in the supported range."],
    ["invalid_note", "Keep the note to 1000 characters or fewer."],
    ["before_planting", "This job can't be done before planting. Set the planting date first."],
    ["not_done", "This stage is already not done. Refresh the page."],
    ["later_stages_done", "Mark the later stages as not done first."],
    ["planting_not_done", "Mark planting done first."],
  ])("maps %s", (code, expected) => {
    expect(stageActionErrorMessage(code)).toBe(expected);
  });
  it("uses the planting date and has a fallback", () => {
    expect(stageActionErrorMessage("before_planting", "2026-04-20")).toContain("20 Apr 2026");
    expect(stageActionErrorMessage("anything-else")).toBe("Something went wrong. Try again.");
  });
});
