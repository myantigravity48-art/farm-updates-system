import { describe, expect, it } from "vitest";
import { authorizeCron, missingAlertEnvironment, REQUIRED_ALERT_ENV } from "./config";

describe("authorizeCron", () => {
  it("rejects wrong, missing and empty headers", () => {
    expect(authorizeCron("Bearer wrong", "secret")).toBe(false);
    expect(authorizeCron(null, "secret")).toBe(false);
    expect(authorizeCron("", "secret")).toBe(false);
  });
  it("accepts the exact header and rejects different length secrets", () => {
    expect(authorizeCron("Bearer secret", "secret")).toBe(true);
    expect(authorizeCron("Bearer secret-long", "secret")).toBe(false);
  });
});

describe("missingAlertEnvironment", () => {
  it("returns only names that are missing or blank", () => {
    expect(missingAlertEnvironment({ CRON_SECRET: "configured" })).toEqual(REQUIRED_ALERT_ENV.filter((name) => name !== "CRON_SECRET"));
  });
});
