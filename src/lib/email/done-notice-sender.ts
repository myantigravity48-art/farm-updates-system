import { sendEmail } from "./send";
import { renderDoneNotice } from "./render";
import { renderDoneNoticeHtml } from "./render-html";
import { selectDoneNoticeRecipients } from "./workflows";

export async function sendDoneNoticesBestEffort(input: {
  recipients: Array<{ id: string; email: string; enabled: boolean }>;
  actorEmail: string | null | undefined;
  notice: Parameters<typeof renderDoneNotice>[0];
  send?: (message: { to: string; subject: string; text: string; html: string }) => Promise<{ ok: boolean; errorCode?: string; missingEnv?: string[] }>;
}) {
  const recipients = selectDoneNoticeRecipients(input.recipients, input.actorEmail);
  const missing = ["RESEND_API_KEY", "ALERT_FROM_ADDRESS", "APP_URL"].filter((name) => !process.env[name]);
  if (missing.length) {
    console.warn("done_notice_not_configured", { missing });
    return;
  }
  const send = input.send ?? ((message) => sendEmail(message));
  const plain = renderDoneNotice(input.notice);
  const html = renderDoneNoticeHtml(input.notice);
  for (let index = 0; index < recipients.length; index += 1) {
    if (index > 0) await new Promise((resolve) => setTimeout(resolve, 600));
    try {
      const result = await send({ to: recipients[index].email, subject: plain.subject, text: plain.text, html: html.html });
      if (!result.ok) console.error("done_notice_send_failed", { errorCode: result.errorCode ?? "email_send_failed", recipientCount: recipients.length });
    } catch (error) {
      console.error("done_notice_send_failed", { errorCode: error instanceof Error && error.name === "AbortError" ? "email_timeout" : "email_send_failed", recipientCount: recipients.length });
    }
  }
}