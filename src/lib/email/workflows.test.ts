import { describe, expect, it } from "vitest";
import { createTestEmailLimiter, mapTestEmailError, scheduleNoticeAfterSuccess, selectDoneNoticeRecipients } from "./workflows";

describe("selectDoneNoticeRecipients", () => {
  it("excludes the actor case-insensitively, disabled rows and case-duplicate emails", () => {
    const recipients = [
      { id: "actor", email: "sample.actor.person@example.com", enabled: true },
      { id: "one", email: "sample.other.person@example.com", enabled: true },
      { id: "duplicate", email: "sample.other.person@example.com", enabled: true },
      { id: "off", email: "sample.off.person@example.com", enabled: false },
    ];
    expect(selectDoneNoticeRecipients(recipients, "SAMPLE.ACTOR.PERSON@example.com").map(({ id }) => id)).toEqual(["one"]);
  });
  it("handles no actor row and empty recipients", () => {
    expect(selectDoneNoticeRecipients([{ id: "one", email: "sample.one.person@example.com", enabled: true }], "sample.missing.person@example.com")).toHaveLength(1);
    expect(selectDoneNoticeRecipients([], null)).toEqual([]);
  });
});

describe("test email limiter", () => {
  it("limits recipients for 60 seconds and allows again after that", () => {
    let time = 0;
    const limiter = createTestEmailLimiter(() => time);
    expect(limiter.tryAcquire("one")).toBe(true);
    expect(limiter.tryAcquire("one")).toBe(false);
    time += 60_000;
    expect(limiter.tryAcquire("one")).toBe(true);
  });
  it("blocks the eleventh test during an hour", () => {
    const limiter = createTestEmailLimiter(() => 1_000);
    for (let index = 0; index < 10; index += 1) expect(limiter.tryAcquire(String(index))).toBe(true);
    expect(limiter.tryAcquire("eleven")).toBe(false);
  });
});

describe("mapTestEmailError", () => {
  it.each([
    ["resend_403", "Resend refused this address."],
    ["resend_422", "Resend rejected the message."],
    ["resend_429", "Resend's sending limit was reached."],
    ["other", "Couldn't send the email."],
    ["email_not_configured", "Email isn't configured. Missing: APP_URL, RESEND_API_KEY."],
    ["limited", "Wait a minute before sending another test."],
  ])("maps %s", (code, expected) => expect(mapTestEmailError(code, code === "email_not_configured" ? ["APP_URL", "RESEND_API_KEY"] : [])).toContain(expected));
});

describe("mark-done result isolation", () => {
  const success = { ok: true, message: "Stage marked done." };
  it.each(["throws", "times out", "returns 403"] as const)("preserves success when the injected sender %s", async (mode) => {
    let callback: (() => Promise<void>) | undefined;
    const result = scheduleNoticeAfterSuccess(success, (task) => { callback = task; }, async () => {
      if (mode === "throws") throw new Error("send failed");
      if (mode === "times out") throw Object.assign(new Error("timeout"), { name: "AbortError" });
      return { ok: false, errorCode: "resend_403" };
    });
    expect(result).toEqual(success);
    await callback?.();
  });
});
