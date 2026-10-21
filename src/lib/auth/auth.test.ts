import { afterEach, describe, expect, it, vi } from "vitest";
import { getSupabaseConfig, MissingSupabaseConfigError } from "@/lib/supabase/config";
import { safeNextPath } from "./next-path";
import { validateNewPassword } from "./password";

describe("safeNextPath", () => {
  it.each(["/farms", "/farms/123?x=1", "/", "/settings#account"])(
    "accepts the relative path %s",
    (value) => {
      expect(safeNextPath(value)).toBe(value);
    },
  );

  it.each([
    "//evil.com",
    "https://evil.com",
    "/\\evil.com",
    "javascript:alert(1)",
    "",
    "farms",
  ])("falls back to / for %s", (value) => {
    expect(safeNextPath(value)).toBe("/");
  });

  it("falls back to / for null and undefined", () => {
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath(undefined)).toBe("/");
  });
});

describe("validateNewPassword", () => {
  it("rejects a password shorter than 12 characters", () => {
    const result = validateNewPassword("short-pass", "short-pass");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toBe("Use at least 12 characters.");
  });

  it("rejects a mismatched confirmation", () => {
    const result = validateNewPassword("a-long-enough-password", "a-different-password");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toBe("The passwords do not match.");
  });

  it("accepts a 12 character password with a matching confirmation", () => {
    expect(validateNewPassword("twelve-chars", "twelve-chars").ok).toBe(true);
  });
});

describe("getSupabaseConfig", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("names the missing variable instead of failing blankly", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-key");

    expect(() => getSupabaseConfig()).toThrow(MissingSupabaseConfigError);
    expect(() => getSupabaseConfig()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });
});
