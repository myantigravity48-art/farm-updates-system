export interface NoticeRecipient { id: string; email: string; enabled: boolean }
export function selectDoneNoticeRecipients<T extends NoticeRecipient>(recipients: T[], actorEmail: string | null | undefined): T[] {
  const actor = actorEmail?.trim().toLowerCase();
  const seen = new Set<string>();
  return recipients.filter((recipient) => {
    const email = recipient.email.trim().toLowerCase();
    if (!recipient.enabled || (actor && email === actor) || seen.has(email)) return false;
    seen.add(email);
    return true;
  });
}

export function createTestEmailLimiter(now: () => number = Date.now) {
  const sent: Array<{ recipientId: string; at: number }> = [];
  return { tryAcquire(recipientId: string): boolean {
    const time = now();
    while (sent.length && time - sent[0].at >= 60 * 60 * 1000) sent.shift();
    if (sent.filter((entry) => entry.recipientId === recipientId).some((entry) => time - entry.at < 60_000)) return false;
    if (sent.length >= 10) return false;
    sent.push({ recipientId, at: time });
    return true;
  } };
}

export function mapTestEmailError(code: string, missingEnv: string[] = []): string {
  if (code === "limited") return "Wait a minute before sending another test.";
  if (missingEnv.length) return `Email isn't configured. Missing: ${missingEnv.join(", ")}.`;
  if (code === "resend_403") return "Resend refused this address. Until your domain is verified, Resend only sends to the email address your Resend account was created with.";
  if (code === "resend_422") return "Resend rejected the message. Check the sender address in your settings.";
  if (code === "resend_429") return "Resend's sending limit was reached. Try again later.";
  return "Couldn't send the email. Try again.";
}

export async function ignoreNoticeSendFailure<T>(send: () => Promise<T>): Promise<void> {
  try { await send(); } catch { /* Done notices never affect the mark-done result. */ }
}

export function scheduleNoticeAfterSuccess<T extends { ok: boolean }>(result: T, schedule: (callback: () => Promise<void>) => void, notify: () => Promise<unknown>): T {
  if (result.ok) schedule(async () => { await ignoreNoticeSendFailure(notify); });
  return result;
}
