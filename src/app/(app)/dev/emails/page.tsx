import { EmailPreview, type EmailPreviewSample } from "@/components/email-preview/email-preview";
import { renderAlertEmail, renderDoneNotice } from "@/lib/email/render";
import { renderAlertEmailHtml, renderDoneNoticeHtml } from "@/lib/email/render-html";
import type { AlertItem, EmailAlertType } from "@/lib/email/render";
import type { CalendarDate } from "@/lib/schedule";

const TODAY: CalendarDate = "2027-03-20";
const APP_URL = "https://your-app-address";

function alert(
  type: EmailAlertType,
  kind: AlertItem["kind"],
  farmId: string,
  farmName: string,
  stageName: string,
  date: CalendarDate,
  days: number,
  windowEnd?: CalendarDate,
): AlertItem {
  return { type, kind, farmId, farmName, stageName, date, days, ...(windowEnd ? { windowEnd } : {}) };
}

function alertSample(label: string, item: AlertItem): EmailPreviewSample {
  return {
    label,
    ...renderAlertEmail({ alerts: [item], today: TODAY, appUrl: APP_URL }),
    ...{ html: renderAlertEmailHtml({ alerts: [item], today: TODAY, appUrl: APP_URL }).html },
  };
}

function digestSample(): EmailPreviewSample {
  const alerts = [
    alert("overdue", "date", "farm-obi", "Obi-Umuagbogho", "First fertilizer", "2027-03-17", 3),
    alert("reminder", "date", "farm-iyanuole", "Iyanuole", "Order seedlings", "2027-03-22", 2),
    alert("window_open", "window", "farm-obaoba", "Obaoba", "Land clearing", "2027-03-01", 11, "2027-03-31"),
  ];
  return {
    label: "Digest: 1 overdue, 2 due soon",
    ...renderAlertEmail({ alerts, today: TODAY, appUrl: APP_URL }),
    html: renderAlertEmailHtml({ alerts, today: TODAY, appUrl: APP_URL }).html,
  };
}

function doneSample(label: string, isLastStage: boolean): EmailPreviewSample {
  const input = {
    farmName: 'Test & <Farm> "Two"',
    stageName: "Land clearing",
    doneByName: "Ada",
    doneDate: TODAY,
    nextStageName: isLastStage ? null : "Order seedlings",
    nextDate: isLastStage ? null : "2027-03-22" as CalendarDate,
    nextHasNoDate: false,
    isLastStage,
    appUrl: APP_URL,
  };
  const rendered = renderDoneNoticeHtml(input);
  return { label, ...renderDoneNotice(input), html: rendered.html };
}

function samples(): EmailPreviewSample[] {
  const date = (day: string) => `2027-03-${day}` as CalendarDate;
  const until = "2027-03-31" as CalendarDate;
  const start = "2027-03-24" as CalendarDate;
  return [
    digestSample(),
    alertSample("Heads-up · date stage", alert("heads_up", "date", "farm-special", 'Test & <Farm> "Two"', "First fertilizer", start, 4)),
    alertSample("Reminder · date stage", alert("reminder", "date", "farm-1", "Iyanuole", "Order seedlings", date("22"), 2)),
    alertSample("Overdue · date stage", alert("overdue", "date", "farm-2", "Obi-Umuagbogho", "First fertilizer", date("17"), 3)),
    alertSample("Heads-up · window stage", alert("heads_up", "window", "farm-3", "Iyanuole", "Land clearing", start, 4, until)),
    alertSample("Reminder · window stage", alert("reminder", "window", "farm-4", "Obaoba", "Planting", start, 4, until)),
    alertSample("Overdue · window stage", alert("overdue", "window", "farm-5", "Uzor Timber", "Land clearing", date("01"), 3, date("17"))),
    alertSample("Window open", alert("window_open", "window", "farm-6", "Iyanuole", "Land clearing", date("01"), 11, until)),
    doneSample("Marked done · next stage", false),
    doneSample("Marked done · last stage", true),
  ];
}

export default function EmailPreviewPage() {
  return <EmailPreview samples={samples()} />;
}
