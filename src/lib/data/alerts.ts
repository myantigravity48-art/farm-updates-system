import { todayInLondon } from "@/lib/schedule";
import { createClient } from "@/lib/supabase/server";
import type { TimingValues } from "@/lib/alerts/validate";

export interface AlertRecipient {
  id: string;
  name: string;
  email: string;
  enabled: boolean;
}

export interface AlertsPageData {
  recipients: AlertRecipient[];
  settings: TimingValues & { sendHourLondon: number };
  today: ReturnType<typeof todayInLondon>;
}

export async function getAlertsPageData(): Promise<AlertsPageData> {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error("Your session has ended. Sign in again.");

  const [recipientsResult, settingsResult] = await Promise.all([
    supabase.from("recipients").select("id, name, email, enabled").order("name", { ascending: true }),
    supabase.from("alert_settings").select("heads_up_days, reminder_days, overdue_enabled, overdue_repeat_days, send_hour_london").limit(1).maybeSingle(),
  ]);

  if (settingsResult.error) throw new Error("Could not load alert settings. Refresh the page and try again.");
  if (!settingsResult.data) throw new Error("Alert settings are missing. Apply supabase/migrations/0002_seed.sql.");
  if (recipientsResult.error) throw new Error("Could not load recipients. Refresh the page and try again.");

  return {
    recipients: recipientsResult.data,
    settings: {
      headsUpDays: settingsResult.data.heads_up_days,
      reminderDays: settingsResult.data.reminder_days,
      overdueEnabled: settingsResult.data.overdue_enabled,
      overdueRepeatDays: settingsResult.data.overdue_repeat_days,
      sendHourLondon: settingsResult.data.send_hour_london,
    },
    // This page is request-rendered through the session-scoped server client; derive the date in London explicitly.
    today: todayInLondon(new Date()),
  };
}
