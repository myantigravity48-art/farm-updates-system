import { describe, expect, it } from "vitest";
import { formatUkDate } from "@/lib/format/dates";
import type { CalendarDate } from "@/lib/schedule";
import { formatEmailDayPhrase, renderAlertEmail, renderDoneNotice, type AlertItem } from "./render";

const today: CalendarDate = "2026-10-14";
const appUrl = "https://your-app-address";

function item(type: AlertItem["type"], kind: AlertItem["kind"], days: number): AlertItem {
  return {
    type,
    kind,
    days,
    farmId: "farm-1",
    farmName: "Iyanuole",
    stageName: "Second round-weeding",
    date: type === "overdue" ? "2026-10-10" : "2026-10-18",
    ...(kind === "window" ? { windowEnd: "2026-10-22" as CalendarDate } : {}),
  };
}

describe("email day phrases and dates", () => {
  it.each([[0, "today"], [1, "tomorrow"], [9, "in 9 days"], [-1, "1 day late"], [-5, "5 days late"]])("formats %i days as %s", (days, phrase) => {
    expect(formatEmailDayPhrase(days)).toBe(phrase);
  });

  it("formats calendar dates in UK weekday order", () => {
    expect(formatUkDate(today)).toBe("Wed 14 Oct 2026");
  });
});

describe("single alert emails", () => {
  it.each(["heads_up", "reminder", "overdue"] as const)("renders a %s date alert", (type) => {
    const { subject, text } = renderAlertEmail({ alerts: [item(type, "date", type === "overdue" ? 1 : 5)], today, appUrl });
    expect(subject).toContain("Iyanuole");
    expect(text).toContain("Second round-weeding");
    expect(text).toContain("Open Iyanuole: https://your-app-address/farms/farm-1");
    expect(text).toContain("You get these emails because you are on the alert list for Farm updates system. To change who gets them, open Alerts in the app.");
  });

  it.each(["heads_up", "reminder", "overdue"] as const)("renders a %s window alert", (type) => {
    const { subject, text } = renderAlertEmail({ alerts: [item(type, "window", type === "overdue" ? 3 : 1)], today, appUrl });
    expect(subject).toContain("Iyanuole");
    expect(text).toContain("window");
    if (type !== "overdue") expect(text).toContain("Sun 18 Oct 2026");
    expect(text).toContain("Thu 22 Oct 2026");
  });

  it("uses singular and plural day wording and today and tomorrow phrases", () => {
    expect(renderAlertEmail({ alerts: [item("heads_up", "date", 0)], today, appUrl }).subject).toContain("due today");
    expect(renderAlertEmail({ alerts: [item("heads_up", "date", 1)], today, appUrl }).subject).toContain("due tomorrow");
    expect(renderAlertEmail({ alerts: [item("reminder", "date", 0)], today, appUrl }).subject).toContain("due today");
    expect(renderAlertEmail({ alerts: [item("reminder", "window", 1)], today, appUrl }).subject).toContain("opens tomorrow");
    expect(renderAlertEmail({ alerts: [item("overdue", "date", 1)], today, appUrl }).subject).toContain("1 day late");
    expect(renderAlertEmail({ alerts: [item("overdue", "date", 5)], today, appUrl }).subject).toContain("5 days late");
  });

  it("renders a window-open single alert with plural, singular and closing-today wording", () => {
    const windowAlert = { ...item("window_open", "window", 10), stageName: "Land clearing", windowEnd: "2027-03-31" as CalendarDate };
    expect(renderAlertEmail({ alerts: [windowAlert], today, appUrl }).subject).toBe("Iyanuole: Land clearing window is open until Wed 31 Mar 2027");
    expect(renderAlertEmail({ alerts: [windowAlert], today, appUrl }).text).toContain("The Land clearing window on Iyanuole is open until Wed 31 Mar 2027 and the stage is not marked done.");
    expect(renderAlertEmail({ alerts: [windowAlert], today, appUrl }).text).toContain("You get these emails because you are on the alert list for Farm updates system.");
  });

  it("keeps names containing ampersands and angle brackets as plain text", () => {
    const alert = { ...item("reminder", "date", 2), farmName: "Uzor & <Timber>" };
    const { subject, text } = renderAlertEmail({ alerts: [alert], today, appUrl });
    expect(subject).toContain("Uzor & <Timber>");
    expect(text).toContain("Uzor & <Timber>");
    expect(text).not.toContain("&amp;");
  });
});

describe("digest emails", () => {
  it("builds overdue-only, due-soon-only and mixed subjects with singular and plural counts", () => {
    const overdueOnly = renderAlertEmail({ alerts: [item("overdue", "date", 2), item("overdue", "window", 4)], today, appUrl });
    expect(overdueOnly.subject).toBe("Farm updates: 2 overdue");
    const dueSoonOnly = renderAlertEmail({ alerts: [item("heads_up", "date", 2), item("reminder", "window", 3)], today, appUrl });
    expect(dueSoonOnly.subject).toBe("Farm updates: 2 due soon");
    const bothSingle = renderAlertEmail({ alerts: [item("overdue", "date", 2), item("reminder", "date", 3)], today, appUrl });
    expect(bothSingle.subject).toBe("Farm updates: 1 overdue, 1 due soon");
    const bothPlural = renderAlertEmail({ alerts: [item("overdue", "date", 2), item("overdue", "date", 5), item("heads_up", "date", 3), item("reminder", "date", 4)], today, appUrl });
    expect(bothPlural.subject).toBe("Farm updates: 2 overdue, 2 due soon");
  });

  it("sorts overdue by most days late first and due soon by earliest date", () => {
    const result = renderAlertEmail({ alerts: [
      { ...item("overdue", "date", 2), farmName: "Less late" },
      { ...item("reminder", "date", 2), farmName: "Later due", date: "2026-10-20" },
      { ...item("overdue", "date", 8), farmName: "Most late" },
      { ...item("heads_up", "date", 5), farmName: "Earlier due", date: "2026-10-17" },
    ], today, appUrl });
    expect(result.text.indexOf("Most late")).toBeLessThan(result.text.indexOf("Less late"));
    expect(result.text.indexOf("Earlier due")).toBeLessThan(result.text.indexOf("Later due"));
    expect(result.text.indexOf("OVERDUE")).toBeLessThan(result.text.indexOf("DUE SOON"));
  });

  it("counts and sorts window-open alerts in due soon with window end then farm name", () => {
    const result = renderAlertEmail({ alerts: [
      { ...item("window_open", "window", 10), farmName: "Zeta", windowEnd: "2026-10-22" },
      { ...item("reminder", "date", 2), farmName: "Order seedlings", stageName: "Order seedlings", date: "2026-10-20" },
      { ...item("window_open", "window", 3), farmName: "Alpha", windowEnd: "2026-10-22" },
    ], today, appUrl });
    expect(result.subject).toBe("Farm updates: 3 due soon");
    expect(result.text.indexOf("Order seedlings")).toBeLessThan(result.text.indexOf("Alpha"));
    expect(result.text.indexOf("Alpha")).toBeLessThan(result.text.indexOf("Zeta"));
    expect(result.text).toContain("Window open until Thu 22 Oct 2026 (10 days left).");
    const oneDayLeft = renderAlertEmail({ alerts: [{ ...item("window_open", "window", 1), windowEnd: "2026-10-22" }, item("reminder", "date", 2)], today, appUrl });
    const closesToday = renderAlertEmail({ alerts: [{ ...item("window_open", "window", 0), windowEnd: "2026-10-22" }, item("reminder", "date", 2)], today, appUrl });
    expect(oneDayLeft.text).toContain("Window open until Thu 22 Oct 2026 (1 day left).");
    expect(closesToday.text).toContain("Window open until Thu 22 Oct 2026 (closes today).");
  });

  it("includes the exact footer", () => {
    const result = renderAlertEmail({ alerts: [item("overdue", "date", 1), item("reminder", "date", 2)], today, appUrl });
    expect(result.text.endsWith("You get these emails because you are on the alert list for Farm updates system. To change who gets them, open Alerts in the app.")).toBe(true);
  });
});

describe("done notice", () => {
  const base = { farmName: "Iyanuole", stageName: "Second round-weeding", doneByName: "Obi", doneDate: today, nextStageName: "Land clearing", nextDate: "2027-03-01" as CalendarDate, nextHasNoDate: false, isLastStage: false, appUrl };

  it("includes the next stage and its date", () => {
    const result = renderDoneNotice(base);
    expect(result.subject).toBe("Iyanuole: Second round-weeding marked done");
    expect(result.text).toContain("Obi marked Second round-weeding done on Iyanuole on Wed 14 Oct 2026. Next: Land clearing, due Mon 1 Mar 2027.");
  });

  it("handles the last stage", () => {
    expect(renderDoneNotice({ ...base, isLastStage: true }).text).toContain("That completes every stage for this farm.");
  });

  it("handles a next stage with no date", () => {
    expect(renderDoneNotice({ ...base, nextDate: null, nextHasNoDate: true }).text).toContain("Next: Land clearing, date not set yet.");
  });
});
