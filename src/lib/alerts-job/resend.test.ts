import { describe, expect, it } from "vitest";
import { buildResendRequest, interpretResendResponse } from "./resend";

describe("Resend request and response", () => {
  it("builds the documented JSON shape and only adds reply_to when configured", () => {
    expect(buildResendRequest({ from: "Farm updates <sample.person@example.com>", to: "sample.person@example.com", subject: "Subject", html: "<p>Hi</p>", text: "Hi" })).toEqual({ from: "Farm updates <sample.person@example.com>", to: ["sample.person@example.com"], subject: "Subject", html: "<p>Hi</p>", text: "Hi" });
    expect(buildResendRequest({ from: "Farm updates <sample.person@example.com>", to: "sample.person@example.com", replyTo: "sample.person@example.com", subject: "Subject", html: "<p>Hi</p>", text: "Hi" }).reply_to).toBe("sample.person@example.com");
  });
  it("interprets success, common failures and malformed bodies without exposing addresses", () => {
    expect(interpretResendResponse(200, { id: "mail-1" })).toEqual({ ok: true, id: "mail-1" });
    for (const [status, code] of [[403, "resend_403"], [422, "resend_422"], [429, "resend_429"], [500, "resend_500"]] as const) {
      const result = interpretResendResponse(status, { message: "sample.person@example.com rejected" });
      expect(result).toMatchObject({ ok: false, errorCode: code });
      expect(JSON.stringify(result)).not.toContain("sample.person@example.com");
    }
    expect(interpretResendResponse(200, null)).toEqual({ ok: false, retry: false, errorCode: "resend_invalid_response" });
  });
});
