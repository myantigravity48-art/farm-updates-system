import { describe, expect, it } from "vitest";
import { isDuplicateEmailError, validateRecipient, validateRecipientUpdate, validateTiming } from "./validate";

describe("validateRecipient", () => {
  it("trims the name and lowercases a valid email", () => {
    expect(validateRecipient({ name: "  Obi  ", email: " OBI@EXAMPLE.COM " }, 0)).toEqual({ ok: true, value: { name: "Obi", email: "obi@example.com", phone: null } });
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
  it("validates optional phone numbers", () => {
    expect(validateRecipient({ name: "A", email: "a@example.com" }, 0)).toMatchObject({ ok: true });
    expect(validateRecipient({ name: "A", email: "a@example.com", phone: " +000 000 0000 " }, 0).ok).toBe(true);
    for (const phone of ["123456", "1".repeat(21), "1234567a", "1".repeat(31)]) {
      expect(validateRecipient({ name: "A", email: "a@example.com", phone }, 0)).toMatchObject({ ok: false, errors: { phone: "Enter a phone number with 7 to 20 digits, or leave it empty." } });
    }
  });
  it("maps duplicate database constraint errors", () => {
    expect(isDuplicateEmailError("duplicate key value violates unique constraint recipients_email_key")).toBe(true);
    expect(isDuplicateEmailError("network error")).toBe(false);
  });
  it("allows the same row email but rejects another row case-insensitively", () => {
    const rows = [{ id: "current", email: "current@example.com" }, { id: "other", email: "other@example.com" }];
    expect(validateRecipientUpdate({ name: "A", email: " CURRENT@EXAMPLE.COM " }, "current", rows).ok).toBe(true);
    expect(validateRecipientUpdate({ name: "A", email: "OTHER@example.com" }, "current", rows)).toMatchObject({ ok: false, errors: { form: "That email address is already on the list." } });
  });
});

describe("validateTiming", () => {
  const valid = { headsUpDays: 14, reminderDays: 3, overdueEnabled: true, overdueRepeatDays: 7, windowNudgeDays: 14 };
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
  it("validates window nudge days from 0 through 60 as an integer", () => {
    for (const windowNudgeDays of [0, 60]) expect(validateTiming({ ...valid, windowNudgeDays }).ok).toBe(true);
    for (const windowNudgeDays of [61, -1, 1.5, "1" as unknown as number]) {
      expect(validateTiming({ ...valid, windowNudgeDays })).toMatchObject({ ok: false, errors: { windowNudgeDays: expect.stringContaining("While a season window is open") } });
    }
  });
});
