export interface ResendRequestInput { from: string; to: string; replyTo?: string; subject: string; html: string; text: string }
export function buildResendRequest(input: ResendRequestInput) {
  return { from: input.from, to: [input.to], ...(input.replyTo ? { reply_to: input.replyTo } : {}), subject: input.subject, html: input.html, text: input.text };
}
export type ResendResponse = { ok: true; id: string } | { ok: false; retry: boolean; errorCode: string };
export function interpretResendResponse(status: number, body: unknown): ResendResponse {
  if (status >= 200 && status < 300) {
    if (typeof body === "object" && body !== null && "id" in body && typeof body.id === "string") return { ok: true, id: body.id };
    return { ok: false, retry: false, errorCode: "resend_invalid_response" };
  }
  if (status === 429) return { ok: false, retry: true, errorCode: "resend_429" };
  if (status === 403) return { ok: false, retry: false, errorCode: "resend_403" };
  if (status === 422) return { ok: false, retry: false, errorCode: "resend_422" };
  return { ok: false, retry: status >= 500, errorCode: `resend_${status}` };
}

const REQUIRED = ["RESEND_API_KEY", "ALERT_FROM_ADDRESS"] as const;
export async function sendEmail(input: { to: string; subject: string; html: string; text: string; idempotencyKey?: string }): Promise<{ ok: true; id: string } | { ok: false; errorCode: string; retry?: boolean; missingEnv?: string[] }> {
  const missingEnv = REQUIRED.filter((name) => !process.env[name]);
  if (missingEnv.length) return { ok: false, errorCode: "email_not_configured", missingEnv };
  const requestBody = buildResendRequest({ from: process.env.ALERT_FROM_ADDRESS!, to: input.to, replyTo: process.env.ALERT_REPLY_TO, subject: input.subject, html: input.html, text: input.text });
  const headers: Record<string, string> = { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" };
  if (input.idempotencyKey) headers["Idempotency-Key"] = input.idempotencyKey;
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers, body: JSON.stringify(requestBody) });
  let body: unknown;
  try { body = await response.json(); } catch { body = null; }
  const result = interpretResendResponse(response.status, body);
  return result.ok ? result : { ok: false, errorCode: result.errorCode, retry: result.retry };
}
