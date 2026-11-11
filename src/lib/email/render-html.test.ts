import { describe, expect, it } from "vitest";
import { formatUkDate } from "@/lib/format/dates";
import type { CalendarDate } from "@/lib/schedule";
import { renderAlertEmail, renderDoneNotice, type AlertItem } from "./render";
import { escapeEmailHtml, renderAlertEmailHtml, renderDoneNoticeHtml } from "./render-html";

const today: CalendarDate = "2027-03-20";
const appUrl = "https://your-app-address";

function sample(type: AlertItem["type"], kind: AlertItem["kind"], index = 0): AlertItem {
  const date = (type === "overdue" ? "2027-03-17" : "2027-03-24") as CalendarDate;
  return {
    type,
    kind,
    farmId: `farm-${index}`,
    farmName: `Farm ${index}`,
    stageName: `Stage ${index}`,
    date,
    ...(kind === "window" ? { windowEnd: "2027-03-31" as CalendarDate } : {}),
    days: type === "overdue" ? 3 : type === "window_open" ? 11 : 4,
  };
}

const regularTypes = ["heads_up", "reminder", "overdue"] as const;
const singleSamples: AlertItem[] = [
  ...regularTypes.flatMap((type) => [sample(type, "date", 1), sample(type, "window", 2)]),
  sample("window_open", "window", 3),
];

describe("HTML alert renderer", () => {
  it.each(singleSamples.map((alert) => [alert.type, alert.kind, alert] as const))(
    "renders a single %s %s alert with the plain-text subject and copy",
    (type, _kind, alert) => {
      const result = renderAlertEmailHtml({ alerts: [alert], today, appUrl });
      const plain = renderAlertEmail({ alerts: [alert], today, appUrl });
      const relevantDate = alert.kind === "window" && (alert.type === "overdue" || alert.type === "window_open") ? alert.windowEnd! : alert.date;
      expect(result.subject).toBe(plain.subject);
      expect(result.html).toContain(`<title>${escapeEmailHtml(plain.subject)}</title>`);
      expect(result.html).toContain(`href="${appUrl}/farms/${alert.farmId}"`);
      expect(result.html).toContain(escapeEmailHtml(alert.farmName));
      expect(result.html).toContain(escapeEmailHtml(alert.stageName));
      expect(result.html).toContain(formatUkDate(relevantDate));
      expect(plain.text).toContain(alert.farmName);
      expect(plain.text).toContain(alert.stageName);
      expect(plain.text).toContain(formatUkDate(relevantDate));
      expect(result.html).toContain("Open the app");
      expect(result.html).toContain("You get these emails because you are on the alert list for Farm updates system. To change who gets them, open Alerts in the app.");
      const heading = type === "overdue" ? "Overdue" : type === "heads_up" ? "Heads-up" : type === "reminder" ? "Reminder" : "Due soon";
      expect(result.html).toContain(heading);
    },
  );

  it.each(singleSamples.map((alert) => [alert.type, alert.kind, alert] as const))(
    "renders a digest containing %s %s with its farm, stage and date in HTML and text",
    (_type, _kind, alert) => {
      const companion = sample("reminder", "date", 90);
      const alerts = [alert, companion];
      const result = renderAlertEmailHtml({ alerts, today, appUrl });
      const plain = renderAlertEmail({ alerts, today, appUrl });
      const relevantDate = alert.kind === "window" && (alert.type === "overdue" || alert.type === "window_open") ? alert.windowEnd! : alert.date;
      expect(result.subject).toBe(plain.subject);
      expect(result.html).toContain(`href="${appUrl}/farms/${alert.farmId}"`);
      expect(result.html).toContain(escapeEmailHtml(alert.farmName));
      expect(result.html).toContain(escapeEmailHtml(alert.stageName));
      expect(result.html).toContain(formatUkDate(relevantDate));
      expect(plain.text).toContain(alert.farmName);
      expect(plain.text).toContain(alert.stageName);
      expect(plain.text).toContain(formatUkDate(relevantDate));
    },
  );

  it("escapes ampersands, angle brackets and quotes in every alert name", () => {
    const alert = {
      ...sample("reminder", "date"),
      farmName: 'Test & <Farm> "Two" \'West\'',
      stageName: 'Stage & <Seed> "A" \'B\'',
    };
    const { html } = renderAlertEmailHtml({ alerts: [alert], today, appUrl });
    expect(html).toContain("Test &amp; &lt;Farm&gt; &quot;Two&quot; &#39;West&#39;");
    expect(html).toContain("Stage &amp; &lt;Seed&gt; &quot;A&quot; &#39;B&#39;");
    expect(html).not.toContain('Test & <Farm> "Two"');
  });

  it("renders the digest sections, CTA, footer, document metadata and only app links", () => {
    const alerts = [sample("overdue", "window", 1), sample("window_open", "window", 2), sample("reminder", "date", 3)];
    const { html, subject } = renderAlertEmailHtml({ alerts, today, appUrl });
    expect(html).toContain('<html lang="en-GB">');
    expect(html).toContain('<meta name="color-scheme" content="light">');
    expect(html).toContain(`<title>${escapeEmailHtml(subject)}</title>`);
    expect(html).toContain(">Overdue</td>");
    expect(html).toContain(">Due soon</td>");
    expect(html).toContain("Window open until");
    expect(html).toContain("11 days left");
    expect(html).toContain("Open the app");
    expect(html).toContain("Farm updates system</td>");
    expect(html).toContain("display:none");
    expect(html).not.toMatch(/<(?:img|script|link)\b/i);
    expect(html).not.toMatch(/url\(|https?:\/\/(?!your-app-address)/i);
    const links = [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
    expect(links.length).toBe(4);
    expect(links.every((link) => link.startsWith(appUrl))).toBe(true);
    expect(html).not.toMatch(/<(?:style|iframe)\b/i);
  });

  it("uses singular and closing-today wording for window-open digest rows", () => {
    for (const [days, phrase] of [[1, "1 day left"], [0, "closes today"]] as const) {
      const alerts = [
        { ...sample("window_open", "window", 1), days },
        sample("reminder", "date", 2),
      ];
      const { html } = renderAlertEmailHtml({ alerts, today, appUrl });
      expect(html).toContain(`(${phrase})`);
    }
  });

  it("keeps a 50-item digest below 100 KB", () => {
    const alerts = Array.from({ length: 50 }, (_, index) => sample(index % 7 === 0 ? "overdue" : index % 5 === 0 ? "window_open" : "reminder", index % 5 === 0 || index % 7 === 0 ? "window" : "date", index));
    const { html } = renderAlertEmailHtml({ alerts, today, appUrl });
    expect(Buffer.byteLength(html, "utf8")).toBeLessThan(100 * 1024);
  });
});

describe("HTML done notice renderer", () => {
  const input = {
    farmName: 'Test & <Farm> "Two"',
    stageName: 'Weeding & <Care> "A"',
    doneByName: 'Ada & <Person> "B" \'C\'',
    doneDate: today,
    nextStageName: 'Order & <seedlings> "soon"',
    nextDate: "2027-04-01" as CalendarDate,
    nextHasNoDate: false,
    isLastStage: false,
    appUrl,
  };

  it("matches the text subject and escapes person, farm and stage details", () => {
    const result = renderDoneNoticeHtml(input);
    const plain = renderDoneNotice(input);
    expect(result.subject).toBe(plain.subject);
    expect(result.html).toContain("Ada &amp; &lt;Person&gt; &quot;B&quot; &#39;C&#39;");
    expect(result.html).toContain("Test &amp; &lt;Farm&gt; &quot;Two&quot;");
    expect(result.html).toContain("Weeding &amp; &lt;Care&gt; &quot;A&quot;");
    expect(result.html).toContain("Order &amp; &lt;seedlings&gt; &quot;soon&quot;");
    expect(result.html).toContain(formatUkDate(today));
    expect(result.html).toContain("Open the app");
    expect(result.html).toContain("You get these emails because you are on the alert list for Farm updates system.");
  });

  it("renders a last-stage completion notice", () => {
    const lastStage = { ...input, isLastStage: true, nextStageName: null, nextDate: null };
    const { html } = renderDoneNoticeHtml(lastStage);
    expect(html).toContain("That completes every stage for this farm.");
  });
});
