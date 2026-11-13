import { describe, expect, it } from "vitest";
import { isPublicPath } from "./public-path";

describe("isPublicPath", () => {
  it.each(["/login", "/forgot-password", "/favicon.ico", "/_next/static/chunk.js", "/api/cron/daily-alerts", "/api/cron/daily-alerts/"])("allows %s", (path) => expect(isPublicPath(path)).toBe(true));
  it.each(["/api/cron/other", "/api/cron", "/api/anything", "/farms", "/api/cron/daily-alerts/extra", "/api/cron/daily-alerts/../farms"])("rejects %s", (path) => expect(isPublicPath(path)).toBe(false));
});
