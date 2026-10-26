import { describe, expect, it } from "vitest";
import { DISPLAY_NAME_MAX, validateDisplayName } from "./display-name";

describe("validateDisplayName", () => {
  it("accepts a name and trims the edges", () => {
    expect(validateDisplayName("  Ada Obi  ")).toEqual({ ok: true, value: "Ada Obi" });
  });

  it("rejects an empty or whitespace-only name", () => {
    expect(validateDisplayName("")).toEqual({
      ok: false,
      error: "Enter a display name.",
      value: null,
    });
    expect(validateDisplayName("   ").ok).toBe(false);
  });

  it("accepts a name on the limit", () => {
    expect(validateDisplayName("a".repeat(DISPLAY_NAME_MAX)).ok).toBe(true);
  });

  it("rejects a name over the limit", () => {
    expect(validateDisplayName("a".repeat(DISPLAY_NAME_MAX + 1))).toEqual({
      ok: false,
      error: `Keep the display name to ${DISPLAY_NAME_MAX} characters or fewer.`,
      value: null,
    });
  });
});
