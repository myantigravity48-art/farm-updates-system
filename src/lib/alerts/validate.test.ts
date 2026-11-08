import { describe, expect, it } from "vitest";
import { isDuplicateEmailError, validateRecipient, validateTiming } from "./validate";

describe("validateRecipient", () => {
  it("trims the name and lowercases a valid email", () => {
    expect(validateRecipient({ name: "  Obi  ", email: " OBI@EXAMPLE.COM " }, 0)).toEqual({ ok: true, value: { name: "Obi", email: "obi@example.com" } });
  });
  it("rejects a whitespace-only name and missing or malformed email", () => {
    expect(validateRecipient({ name: "   ", email: "a@b.com" }, 0)).toMatchObject({ ok: false, errors: { name: "Enter a name." } });
    expect(validateRecipient({ name: "A", email: " " }, 0)).toMatchObject({ ok: false, errors: { email: "Enter an email address." } });
    expect(validateRecipient({ name: "A", email: "not-an-email" }, 0).ok).toBe(false);
  });
  it("enforces name/email length boundaries and the 10-recipient cap", () => {
    expect(validateRecipient({ name: "n".repeat(60), email: `${"a".repeat(242)}@example.com` }, 9).ok).toBe(true);
    expect(validateRecipient({ name: "n".repeat(61), email: "a@example.com" }, 0).ok).toBe(false);
    expect(validateRecipient({ name: "A", email: `${"a".repeat(243)}@example.com` }, 0).ok).toBe(false);
    expect(validateRecipient({ name: "A", email: "a@example.com" }, 10)).toMatchObject({ ok: false, errors: { form: expect.any(String) } });
  });
  it("maps duplicate database constraint errors", () => {
    expect(isDuplicateEmailError("duplicate key value violates unique constraint recipients_email_key")).toBe(true);
    expect(isDuplicateEmailError("network error")).toBe(false);
  });
});

describe("validateTiming", () => {
  const valid = { headsUpDays: 14, reminderDays: 3, overdueEnabled: true, overdueRepeatDays: 3 };
  it("accepts both boundaries", () => {
    expect(validateTiming({ ...valid, headsUpDays: 1, reminderDays: 0, overdueRepeatDays: 1 }).ok).toBe(true);
    expect(validateTiming({ ...valid, headsUpDays: 60, reminderDays: 30, overdueRepeatDays: 30 }).ok).toBe(true);
  });
  it("rejects non-integers and values outside each field range", () => {
    expect(validateTiming({ ...valid, headsUpDays: 0 }).ok).toBe(false);
    expect(validateTiming({ ...valid, headsUpDays: 61 }).ok).toBe(false);
    expect(validateTiming({ ...valid, headsUpDays: 1.5 }).ok).toBe(false);
    expect(validateTiming({ ...valid, reminderDays: -1 }).ok).toBe(false);
    expect(validateTiming({ ...valid, reminderDays: 31 }).ok).toBe(false);
    expect(validateTiming({ ...valid, overdueRepeatDays: 0 }).ok).toBe(false);
    expect(validateTiming({ ...valid, overdueRepeatDays: 31 }).ok).toBe(false);
    expect(validateTiming({ ...valid, overdueRepeatDays: 2.2 }).ok).toBe(false);
  });
  it("rejects a reminder equal to or greater than the heads-up", () => {
    expect(validateTiming({ ...valid, reminderDays: 14 })).toMatchObject({ ok: false, errors: { reminderDays: expect.any(String) } });
    expect(validateTiming({ ...valid, headsUpDays: 5, reminderDays: 6 }).ok).toBe(false);
  });
  it("requires a boolean overdue setting", () => {
    const result = validateTiming({ ...valid, overdueEnabled: "yes" as unknown as boolean });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.overdueEnabled).toBeTruthy();
  });
});
