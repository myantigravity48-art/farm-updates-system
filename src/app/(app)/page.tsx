import { redirect } from "next/navigation";
import { AddFarmCta } from "@/components/dashboard/add-farm-cta";
import { DashboardScreen } from "@/components/dashboard/dashboard-screen";
import { ConfigError } from "@/components/auth/config-error";
import { readSession } from "@/lib/auth/session";
import { getDashboardData } from "@/lib/data/dashboard";
import { getStageConfig } from "@/lib/data/farms";
import type { StageConfig } from "@/lib/data/types";
import { formatUkDate } from "@/lib/format/dates";
import { getGreeting } from "@/lib/format/greeting";
import { todayInLondon } from "@/lib/schedule";

export default async function DashboardPage() {
  const session = await readSession();

  if (session.status === "signed-out") redirect("/login");

  if (session.status === "missing-config") {
    return <ConfigError variable={session.variable} />;
  }

  const now = new Date();
  const today = todayInLondon(now);
  // The name is highlighted separately by DashboardScreen, so the greeting
  // itself stays name-free to avoid showing it twice.
  const greeting = getGreeting(now);

  const model = await getDashboardData().catch(() => null);

  if (!model) {
    return (
      <div role="alert" className="rounded-[14px] border border-border bg-surface p-6 text-sm text-text">
        Could not load the dashboard. Refresh the page to try again.
      </div>
    );
  }

  if (model.kpis.farms === 0) {
    const stageConfig = await getStageConfig().catch(
      (): StageConfig | null => null,
    );
    return <AddFarmCta stageConfig={stageConfig} />;
  }

  return (
    <DashboardScreen
      model={model}
      greeting={greeting}
      greetingName={session.user.displayName}
      todayLabel={formatUkDate(today)}
    />
  );
}
