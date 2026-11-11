import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultAlertSettings } from "@/lib/schedule";
import type { AlertJobData, AlertJobDependencies, ClaimedAlert } from "./run";
import { buildAlertIdempotencyKey, runDailyAlerts } from "./run";

const previousAppUrl = process.env.APP_URL;
afterEach(() => { if (previousAppUrl === undefined) delete process.env.APP_URL; else process.env.APP_URL = previousAppUrl; });

function data(recipients = [{ id: "r1", name: "Person One", email: "sample.person@example.com", enabled: true }]): AlertJobData {
  return {
    farms: [{ id: "f1", name: "Farm One", plantingDate: "2027-06-01", anchorDate: "2027-06-01", stages: [{ position: 1, farmStageId: "s1", isDone: false, doneDate: null, dueDateOverride: null }] }],
    templates: [{ position: 1, name: "Fertilizer", triggerType: "after_planting", offsetMonths: 1 }],
    windows: [],
    settings: { ...defaultAlertSettings, sendHourLondon: 8, windowNudgeDays: 0 },
    recipients,
    sent: [],
  };
}

function dependencies(overrides: Partial<AlertJobDependencies> = {}): AlertJobDependencies {
  return {
    now: () => new Date("2027-06-17T07:30:00.000Z"),
    loadData: async () => data(),
    claim: async (recipientId, keys) => keys.map((key, index) => ({ ...key, recipientId, id: `claimed-${index}` })) as ClaimedAlert[],
    send: async () => ({ ok: true, id: "provider-1" }),
    finish: async () => {},
    ...overrides,
  };
}

describe("runDailyAlerts", () => {
  it("dry runs report counts without claiming or sending", async () => {
    const claim = vi.fn(); const send = vi.fn();
    const result = await runDailyAlerts(dependencies({ claim, send }), { dryRun: true, force: true });
    expect(result).toMatchObject({ ok: true, dryRun: true, recipientsWithAlerts: 1, alertsByType: { heads_up: 1 } });
    expect(claim).not.toHaveBeenCalled(); expect(send).not.toHaveBeenCalled();
  });

  it("skips outside the London send hour unless force is set", async () => {
    const deps = dependencies({ now: () => new Date("2027-06-17T06:30:00.000Z"), claim: vi.fn(), send: vi.fn() });
    expect(await runDailyAlerts(deps, { dryRun: false, force: false })).toEqual({ ok: true, skipped: "not send hour" });
    expect(await runDailyAlerts(deps, { dryRun: true, force: true })).toMatchObject({ ok: true, dryRun: true });
  });

  it("skips when there are no enabled recipients or alerts", async () => {
    expect(await runDailyAlerts(dependencies({ loadData: async () => data([]) }), { dryRun: false, force: true })).toEqual({ ok: true, skipped: "nothing to send" });
    expect(await runDailyAlerts(dependencies({ loadData: async () => ({ ...data(), sent: [{ recipientId: "r1", farmStageId: "s1", alertType: "heads_up", occurrenceKey: "1:heads_up:2027-07-01" }] }) }), { dryRun: false, force: true })).toEqual({ ok: true, skipped: "nothing to send" });
  });

  it("sends a digest for one recipient and returns no names or addresses", async () => {
    process.env.APP_URL = "https://example.test";
    const input = data();
    input.farms.push({ ...input.farms[0], id: "f2", name: "Farm Two", stages: [{ ...input.farms[0].stages[0], farmStageId: "s2" }] });
    const send = vi.fn(async (payload: Parameters<AlertJobDependencies["send"]>[0]) => { expect(payload.text).toContain("Farm One"); expect(payload.text).toContain("Farm Two"); return { ok: true as const, id: "provider-1" }; });
    const result = await runDailyAlerts(dependencies({ loadData: async () => input, send }), { dryRun: false, force: true });
    expect(send).toHaveBeenCalledOnce();
    expect(result).toMatchObject({ ok: true, sentCount: 2, recipients: [{ index: 1, alertCount: 2, status: "sent" }] });
    expect(JSON.stringify(result)).not.toContain("Person One"); expect(JSON.stringify(result)).not.toContain("sample.person@example.com");
  });

  it("sends only claimed entries when claim returns a subset", async () => {
    const input = data(); input.farms.push({ ...input.farms[0], id: "f2", name: "Farm Two", stages: [{ ...input.farms[0].stages[0], farmStageId: "s2" }] });
    let sentText = "";
    const result = await runDailyAlerts(dependencies({
      loadData: async () => input,
      claim: async (recipientId, keys) => [{ ...keys[0], recipientId, id: "only-one" } as ClaimedAlert],
      send: async (payload) => { sentText = payload.text; return { ok: true, id: "id" }; },
    }), { dryRun: false, force: true });
    expect(sentText).toContain("Farm One"); expect(sentText).not.toContain("Farm Two");
    expect(result).toMatchObject({ sentCount: 1, recipients: [{ alertCount: 1 }] });
  });

  it("marks send failures failed and exceptions after claiming failed before rethrowing", async () => {
    const finish = vi.fn();
    const failed = await runDailyAlerts(dependencies({ send: async () => ({ ok: false, retry: false, errorCode: "resend_403" }), finish }), { dryRun: false, force: true });
    expect(finish).toHaveBeenCalledWith(["claimed-0"], "failed", null, "resend_403");
    expect(failed).toMatchObject({ ok: false, failedCount: 1 });
    const exceptionFinish = vi.fn();
    await expect(runDailyAlerts(dependencies({ send: async () => { throw new Error("network"); }, finish: exceptionFinish }), { dryRun: false, force: true })).rejects.toThrow("network");
    expect(exceptionFinish).toHaveBeenCalledWith(["claimed-0"], "failed", null, "job_exception");
  });

  it("stops after a 429 and marks those claimed rows failed", async () => {
    const recipients = [{ id: "r1", name: "Person One", email: "sample.person@example.com", enabled: true }, { id: "r2", name: "Person Two", email: "sample.other.person@example.com", enabled: true }];
    const send = vi.fn(async () => ({ ok: false as const, retry: true, errorCode: "resend_429" })); const finish = vi.fn();
    const result = await runDailyAlerts(dependencies({ loadData: async () => data(recipients), send, finish }), { dryRun: false, force: true });
    expect(send).toHaveBeenCalledOnce(); expect(finish).toHaveBeenCalledWith(["claimed-0"], "failed", null, "resend_429");
    expect(result).toMatchObject({ rateLimited: true, failedCount: 1, recipients: [{ status: "failed" }] });
  });

  it("supports failed and stale pending retry claims and keeps recipient sent sets separate", async () => {
    for (const state of ["failed", "stale_pending"] as const) {
      const claim = vi.fn(async (recipientId: string, keys: Parameters<AlertJobDependencies["claim"]>[1]) => state === "failed" || state === "stale_pending" ? keys.map((key) => ({ ...key, recipientId, id: state }) as ClaimedAlert) : []);
      const result = await runDailyAlerts(dependencies({ claim }), { dryRun: false, force: true });
      expect(claim).toHaveBeenCalledOnce(); expect(result).toMatchObject({ sentCount: 1 });
    }
    const recipients = [{ id: "r1", name: "Person One", email: "sample.person@example.com", enabled: true }, { id: "r2", name: "Person Two", email: "sample.other.person@example.com", enabled: true }];
    const sent = [{ recipientId: "r2", farmStageId: "s1", alertType: "heads_up" as const, occurrenceKey: "1:heads_up:2027-07-01" }];
    const send = vi.fn(async () => ({ ok: true as const, id: "provider" }));
    await runDailyAlerts(dependencies({ loadData: async () => ({ ...data(recipients), sent }), send }), { dryRun: false, force: true });
    expect(send).toHaveBeenCalledOnce();
  });

  it("builds a stable bounded idempotency key from sorted claimed IDs", () => {
    expect(buildAlertIdempotencyKey("recipient-1", "2027-06-17", ["b", "a"])).toBe(buildAlertIdempotencyKey("recipient-1", "2027-06-17", ["a", "b"]));
    expect(buildAlertIdempotencyKey("recipient-1", "2027-06-17", Array.from({ length: 100 }, (_, i) => `row-${i}`))).toHaveLength(11 + 1 + 10 + 1 + 64);
  });
});
