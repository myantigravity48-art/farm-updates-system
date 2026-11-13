import { describe, expect, it } from "vitest";
import { describeResponse } from "../src/lib/alerts-job/describe-response";

describe("describeResponse", () => {
  it("describes redirects, unauthorized, server errors and web pages", () => {
    expect(describeResponse({ status: 307, location: "/login" })).toMatch(/redirected to a login page/);
    expect(describeResponse({ status: 401 })).toMatch(/job rejected the secret/);
    expect(describeResponse({ status: 500, contentType: "application/json" })).toBeNull();
    expect(describeResponse({ status: 200, contentType: "text/html" })).toBe("The server returned a web page, not JSON (status 200).");
  });
});
