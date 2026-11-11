import { formatUkDate } from "@/lib/format/dates";
import type { CalendarDate } from "@/lib/schedule";
import { emailTheme as theme } from "./email-theme";
import { formatEmailDayPhrase, renderAlertEmail, renderDoneNotice, type AlertItem, type DoneNoticeInput, type EmailAlertType } from "./render";

type AlertEmailInput = Parameters<typeof renderAlertEmail>[0];
type HtmlResult = { subject: string; html: string };

const FOOTER = "You get these emails because you are on the alert list for Farm updates system. To change who gets them, open Alerts in the app.";
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif";

export function escapeEmailHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function href(value: string): string {
  return escapeEmailHtml(value);
}

function farmHref(appUrl: string, farmId: string): string {
  return href(`${appUrl}/farms/${encodeURIComponent(farmId)}`);
}

function dayPhrase(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

function dueSoonDetails(item: AlertItem): string {
  if (item.type === "window_open") {
    const left = item.days === 0 ? "closes today" : `${item.days} ${item.days === 1 ? "day" : "days"} left`;
    return `Window open until ${formatUkDate(item.windowEnd!)} (${left}).`;
  }
  if (item.kind === "window") {
    return `Window opens ${formatUkDate(item.date)} (${item.type === "heads_up" ? dayPhrase(item.days) : formatEmailDayPhrase(item.days)}); closes ${formatUkDate(item.windowEnd!)}.`;
  }
  return `Due ${formatUkDate(item.date)} (${item.type === "heads_up" ? dayPhrase(item.days) : formatEmailDayPhrase(item.days)}).`;
}

function overdueDetails(item: AlertItem): string {
  const daysLate = `${item.days} ${item.days === 1 ? "day" : "days"} late`;
  return item.kind === "window"
    ? `Window closed ${formatUkDate(item.windowEnd!)} (${daysLate}).`
    : `Due ${formatUkDate(item.date)} (${daysLate}).`;
}

function singleAlertLine(item: AlertItem): string {
  if (item.type === "window_open") {
    return `The ${item.stageName} window on ${item.farmName} is open until ${formatUkDate(item.windowEnd!)} and the stage is not marked done.`;
  }
  if (item.type === "overdue") {
    return item.kind === "window"
      ? `The ${item.stageName} window on ${item.farmName} closed on ${formatUkDate(item.windowEnd!)} and the stage is not marked done.`
      : `${item.stageName} on ${item.farmName} was due on ${formatUkDate(item.date)} and is not marked done.`;
  }
  if (item.kind === "window") {
    return `The ${item.stageName} window on ${item.farmName} opens on ${formatUkDate(item.date)} and closes on ${formatUkDate(item.windowEnd!)}.`;
  }
  return `${item.stageName} on ${item.farmName} is due on ${formatUkDate(item.date)}.`;
}

function singleHeading(type: EmailAlertType): string {
  if (type === "heads_up") return "Heads-up";
  if (type === "reminder") return "Reminder";
  if (type === "overdue") return "Overdue";
  return "Due soon";
}

function itemRow(item: AlertItem, appUrl: string, details: string, single = false): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;border-bottom:1px solid ${theme.border};">
    <tr><td style="padding:14px 20px 2px;font-family:${FONT};font-size:16px;line-height:1.5;color:${theme.text};"><a href="${farmHref(appUrl, item.farmId)}" style="color:${theme.text};font-weight:700;text-decoration:underline;">${escapeEmailHtml(item.farmName)}</a></td></tr>
    <tr><td style="padding:0 20px 14px;font-family:${FONT};font-size:14px;line-height:1.5;color:${theme.secondary};">${single ? escapeEmailHtml(details) : `${escapeEmailHtml(item.stageName)}. ${escapeEmailHtml(details)}`}</td></tr>
  </table>`;
}

function alertContent(alerts: AlertItem[], today: CalendarDate, appUrl: string): { content: string; preheader: string } {
  if (alerts.length === 1) {
    const item = alerts[0];
    const sentence = singleAlertLine(item);
    const sectionColor = item.type === "overdue" ? theme.overdue : theme.dueSoon;
    return {
      content: `<tr><td style="padding:22px 20px 8px;font-family:${FONT};font-size:20px;line-height:1.4;font-weight:600;color:${sectionColor};">${singleHeading(item.type)}</td></tr>
        <tr><td style="padding:0;">${itemRow(item, appUrl, sentence, true)}</td></tr>`,
      preheader: sentence,
    };
  }

  const overdue = alerts.filter((item) => item.type === "overdue").sort((a, b) => b.days - a.days);
  const dueSoon = alerts.filter((item) => item.type !== "overdue").sort((a, b) => {
    const dateA = a.type === "window_open" ? a.windowEnd! : a.date;
    const dateB = b.type === "window_open" ? b.windowEnd! : b.date;
    return dateA.localeCompare(dateB) || a.farmName.localeCompare(b.farmName);
  });

  const sections = [
    overdue.length ? `<tr><td style="padding:20px 20px 8px;font-family:${FONT};font-size:15px;line-height:1.4;font-weight:700;color:${theme.overdue};">Overdue</td></tr>${overdue.map((item) => itemRow(item, appUrl, overdueDetails(item))).join("")}` : "",
    dueSoon.length ? `<tr><td style="padding:20px 20px 8px;font-family:${FONT};font-size:15px;line-height:1.4;font-weight:700;color:${theme.dueSoon};">Due soon</td></tr>${dueSoon.map((item) => itemRow(item, appUrl, dueSoonDetails(item))).join("")}` : "",
  ].filter(Boolean);
  const content = `<tr><td style="padding:22px 20px 4px;font-family:${FONT};font-size:16px;line-height:1.5;color:${theme.text};">Good morning.</td></tr>${sections.join("")}`;
  const plainText = renderAlertEmail({ alerts, today, appUrl }).text;
  const firstSection = plainText.split("\n\n").find((part) => part.startsWith("OVERDUE\n") || part.startsWith("DUE SOON\n"));
  const preheader = firstSection?.split("\n")[1]?.replace(/^-\s*/, "") ?? "Good morning.";
  return { content, preheader };
}

function emailDocument(subject: string, preheader: string, bodyRows: string, appUrl: string): string {
  const escapedSubject = escapeEmailHtml(subject);
  const buttonLabel = "Open the app";
  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapedSubject}</title>
</head>
<body style="margin:0;padding:0;background-color:${theme.background};color:${theme.text};font-family:${FONT};font-size:16px;line-height:1.5;">
<div style="display:none!important;visibility:hidden;mso-hide:all;max-height:0;max-width:0;overflow:hidden;opacity:0;color:transparent;">${escapeEmailHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${theme.background}" style="width:100%;background-color:${theme.background};border-collapse:collapse;">
  <tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" bgcolor="${theme.card}" style="width:100%;max-width:560px;background-color:${theme.card};border:1px solid ${theme.border};border-collapse:separate;border-spacing:0;">
      <tr><td bgcolor="${theme.primary}" style="padding:12px 20px;background-color:${theme.primary};color:${theme.onPrimary};font-family:${FONT};font-size:16px;line-height:1.5;">Farm updates system</td></tr>
      ${bodyRows}
      <tr><td style="padding:22px 20px 18px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;"><tr><td align="center" height="44" bgcolor="${theme.primary}" style="height:44px;background-color:${theme.primary};border-radius:4px;"><a href="${href(appUrl)}" style="display:block;min-height:44px;padding:0 16px;color:${theme.onPrimary};font-family:${FONT};font-size:16px;line-height:44px;text-align:center;text-decoration:none;">${buttonLabel}</a></td></tr></table>
      </td></tr>
      <tr><td style="padding:0 20px 20px;font-family:${FONT};font-size:13px;line-height:1.5;color:${theme.secondary};">${FOOTER}</td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

export function renderAlertEmailHtml({ alerts, today, appUrl }: AlertEmailInput): HtmlResult {
  const { subject } = renderAlertEmail({ alerts, today, appUrl });
  const { content, preheader } = alertContent(alerts, today, appUrl);
  return { subject, html: emailDocument(subject, preheader, content, appUrl) };
}

export function renderDoneNoticeHtml(input: DoneNoticeInput): HtmlResult {
  const { subject, text } = renderDoneNotice(input);
  const body = text.split("\n\n")[0];
  const preheader = `${input.doneByName} marked ${input.stageName} done on ${input.farmName} on ${formatUkDate(input.doneDate)}.`;
  const content = `<tr><td style="padding:22px 20px 8px;font-family:${FONT};font-size:20px;line-height:1.4;font-weight:600;color:${theme.text};">${escapeEmailHtml(input.stageName)} marked done</td></tr>
    <tr><td style="padding:0 20px 20px;font-family:${FONT};font-size:16px;line-height:1.5;color:${theme.text};">${escapeEmailHtml(body)}</td></tr>`;
  return { subject, html: emailDocument(subject, preheader, content, input.appUrl) };
}
