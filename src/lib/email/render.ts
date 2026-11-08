import type { CalendarDate } from "@/lib/schedule";
import { formatUkDate } from "@/lib/format/dates";

export type EmailAlertType = "heads_up" | "reminder" | "overdue";

export interface AlertItem {
  type: EmailAlertType;
  farmId: string;
  farmName: string;
  stageName: string;
  kind: "date" | "window";
  date: CalendarDate;
  windowEnd?: CalendarDate;
  days: number;
}
export interface DoneNoticeInput {
  farmName: string;
  stageName: string;
  doneByName: string;
  doneDate: CalendarDate;
  nextStageName: string | null;
  nextDate: CalendarDate | null;
  nextHasNoDate: boolean;
  isLastStage: boolean;
  appUrl: string;
}

const FOOTER = "You get these emails because you are on the alert list for Farm updates system. To change who gets them, open Alerts in the app.";

export function formatEmailDayPhrase(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days > 1) return `in ${days} days`;
  if (days === -1) return "1 day late";
  return `${Math.abs(days)} days late`;
}

function duePhrase(item: AlertItem): string {
  if (item.type === "overdue") return `${item.days} ${item.days === 1 ? "day" : "days"} late`;
  return formatEmailDayPhrase(item.days);
}

function renderSingle(item: AlertItem, appUrl: string): { subject: string; text: string } {
  const link = `${appUrl}/farms/${item.farmId}`;
  const date = formatUkDate(item.date);
  const windowed = item.kind === "window";
  let subject: string;
  let line: string;

  if (item.type === "heads_up") {
    subject = windowed
      ? `${item.farmName}: ${item.stageName} window opens ${item.days === 0 ? "today" : item.days === 1 ? "tomorrow" : `in ${item.days} days`}`
      : `${item.farmName}: ${item.stageName} due ${formatEmailDayPhrase(item.days)}`;
    line = windowed
      ? `The ${item.stageName} window on ${item.farmName} opens on ${date} and closes on ${formatUkDate(item.windowEnd!)}`
      : `${item.stageName} on ${item.farmName} is due on ${date}`;
  } else if (item.type === "reminder") {
    subject = windowed
      ? `${item.farmName}: ${item.stageName} window opens ${formatEmailDayPhrase(item.days)}`
      : `${item.farmName}: ${item.stageName} due ${formatEmailDayPhrase(item.days)}`;
    line = windowed
      ? `The ${item.stageName} window on ${item.farmName} opens on ${date} and closes on ${formatUkDate(item.windowEnd!)}`
      : `${item.stageName} on ${item.farmName} is due on ${date}`;
  } else {
    subject = windowed
      ? `Overdue: ${item.farmName}, ${item.stageName} window closed`
      : `Overdue: ${item.farmName}, ${item.stageName} (${item.days} ${item.days === 1 ? "day" : "days"} late)`;
    line = windowed
      ? `The ${item.stageName} window on ${item.farmName} closed on ${formatUkDate(item.windowEnd!)} and the stage is not marked done`
      : `${item.stageName} on ${item.farmName} was due on ${date} and is not marked done`;
  }

  return { subject, text: `${line}.\n\nOpen ${item.farmName}: ${link}\n\n${FOOTER}` };
}

function alertLine(item: AlertItem): string {
  if (item.type === "overdue") {
    const when = item.kind === "window"
      ? `Window closed ${formatUkDate(item.windowEnd!)} (${item.days} ${item.days === 1 ? "day" : "days"} late).`
      : `Due ${formatUkDate(item.date)} (${item.days} ${item.days === 1 ? "day" : "days"} late).`;
    return `- ${item.farmName}: ${item.stageName}. ${when}`;
  }

  const when = item.kind === "window"
    ? `Window opens ${formatUkDate(item.date)} (${duePhrase(item)}); closes ${formatUkDate(item.windowEnd!)}.`
    : `Due ${formatUkDate(item.date)} (${duePhrase(item)}).`;
  return `- ${item.farmName}: ${item.stageName}. ${when}`;
}

/** Plain-text rendering only. The HTML version will be built in the email job step. TODO: add HTML alongside this renderer then. */
export function renderAlertEmail({
  alerts,
  today,
  appUrl,
}: {
  alerts: AlertItem[];
  today: CalendarDate;
  appUrl: string;
}): { subject: string; text: string } {
  // The caller passes today's London date as part of the stable rendering context.
  void today;
  if (alerts.length === 1) return renderSingle(alerts[0], appUrl);

  const overdue = alerts.filter((item) => item.type === "overdue").sort((a, b) => b.days - a.days);
  const dueSoon = alerts.filter((item) => item.type !== "overdue").sort((a, b) => a.date.localeCompare(b.date));
  const subjectParts = [
    overdue.length ? `${overdue.length} overdue` : "",
    dueSoon.length ? `${dueSoon.length} due soon` : "",
  ].filter(Boolean);
  const sections = [
    overdue.length ? `OVERDUE\n${overdue.map(alertLine).join("\n")}` : "",
    dueSoon.length ? `DUE SOON\n${dueSoon.map(alertLine).join("\n")}` : "",
  ].filter(Boolean);
  const text = [
    "Good morning.",
    ...sections,
    `Open the app: ${appUrl}`,
    FOOTER,
  ].join("\n\n");
  return { subject: `Farm updates: ${subjectParts.join(", ")}`, text };
}

export function renderDoneNotice(input: DoneNoticeInput): { subject: string; text: string } {
  const { farmName, stageName, doneByName, doneDate, nextStageName, nextDate, nextHasNoDate, isLastStage } = input;
  let body = `${doneByName} marked ${stageName} done on ${farmName} on ${formatUkDate(doneDate)}.`;
  if (isLastStage) {
    body += " That completes every stage for this farm.";
  } else if (nextHasNoDate && nextStageName) {
    body += ` Next: ${nextStageName}, date not set yet.`;
  } else if (nextStageName && nextDate) {
    body += ` Next: ${nextStageName}, due ${formatUkDate(nextDate)}.`;
  }
  return {
    subject: `${farmName}: ${stageName} marked done`,
    text: `${body}\n\nOpen the app: ${input.appUrl}\n\n${FOOTER}`,
  };
}
