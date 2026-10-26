import { describe, expect, it } from "vitest";
import { NOTE_BODY_MAX, validateNote, validateNoteBody } from "./validate";

const stageIds = [
  "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
];

describe("validateNoteBody", () => {
  it("rejects an empty note", () => {
    expect(validateNoteBody("")).toBe("Add a note.");
    expect(validateNoteBody("   \n\t ")).toBe("Add a note.");
  });

  it("accepts a note on the length limit", () => {
    expect(validateNoteBody("a".repeat(NOTE_BODY_MAX))).toBeUndefined();
  });

  it("rejects a note over the length limit", () => {
    expect(validateNoteBody("a".repeat(NOTE_BODY_MAX + 1))).toBe(
      `Keep the note to ${NOTE_BODY_MAX} characters or fewer.`,
    );
  });
});

describe("validateNote", () => {
  it("accepts a valid note and trims the body", () => {
    const result = validateNote(
      { body: "  First rain reached the far rows.  ", stageId: "" },
      { stageIds },
    );

    expect(result).toEqual({
      ok: true,
      errors: {},
      values: { body: "First rain reached the far rows.", stageId: null },
    });
  });

  it("links a stage that belongs to the farm", () => {
    const result = validateNote(
      { body: "Weeds cut along the east edge.", stageId: stageIds[1] },
      { stageIds },
    );

    expect(result.ok).toBe(true);
    expect(result.values?.stageId).toBe(stageIds[1]);
  });

  it("rejects a stage that belongs to another farm", () => {
    const result = validateNote(
      {
        body: "Weeds cut along the east edge.",
        stageId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      },
      { stageIds },
    );

    expect(result.ok).toBe(false);
    expect(result.errors.stageId).toBe("Choose a stage from this farm.");
    expect(result.values).toBeNull();
  });

  it("rejects a malformed stage id", () => {
    const result = validateNote(
      { body: "A note.", stageId: "not-a-stage-id" },
      { stageIds },
    );

    expect(result.ok).toBe(false);
    expect(result.errors.stageId).toBe("Choose a stage from this farm.");
  });

  it("returns both field errors when the body and link are wrong", () => {
    const result = validateNote(
      { body: "   ", stageId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" },
      { stageIds },
    );

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual({
      body: "Add a note.",
      stageId: "Choose a stage from this farm.",
    });
  });
});
