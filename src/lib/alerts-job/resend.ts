export interface ResendRequestInput {
  from: string;
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
}

export function buildResendRequest(input: ResendRequestInput) {
  return {
    from: input.from,
    to: [input.to],
    ...(input.replyTo ? { reply_to: input.replyTo } : {}),
    subject: input.subject,
    html: input.html,
    text: input.text,
  };
}

export type ResendResponse = { ok: true; id: string } | { ok: false; retry: boolean; errorCode: string };

export function interpretResendResponse(status: number, body: unknown): ResendResponse {
  if (status >= 200 && status < 300) {
    if (typeof body === "object" && body !== null && "id" in body && typeof body.id === "string") {
      return { ok: true, id: body.id };
    }
    return { ok: false, retry: false, errorCode: "resend_invalid_response" };
  }
  if (status === 429) return { ok: false, retry: true, errorCode: "resend_429" };
  if (status === 403) return { ok: false, retry: false, errorCode: "resend_403" };
  if (status === 422) return { ok: false, retry: false, errorCode: "resend_422" };
  return { ok: false, retry: status >= 500, errorCode: `resend_${status}` };
}
