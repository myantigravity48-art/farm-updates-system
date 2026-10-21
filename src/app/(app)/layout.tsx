import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { ConfigError } from "@/components/auth/config-error";
import { getFarmSummaries, getStageConfig } from "@/lib/data/farms";
import type { StageConfig } from "@/lib/data/types";
import { readSession } from "@/lib/auth/session";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<AppLoading />}>
      <AuthenticatedFrame>{children}</AuthenticatedFrame>
    </Suspense>
  );
}

async function AuthenticatedFrame({ children }: { children: ReactNode }) {
  const session = await readSession();

  if (session.status === "signed-out") {
    redirect("/login");
  }

  if (session.status === "missing-config") {
    return <ConfigError variable={session.variable} />;
  }

  const [farmResult, stageResult] = await Promise.allSettled([
    getFarmSummaries(),
    getStageConfig(),
  ]);

  const farms = farmResult.status === "fulfilled" ? farmResult.value : [];
  const farmsLoadFailed = farmResult.status === "rejected";
  const stageConfig: StageConfig =
    stageResult.status === "fulfilled"
      ? stageResult.value
      : { stages: [], plantingPosition: 1 };

  return (
    <AppShell
      email={session.user.email}
      farms={farms}
      stageConfig={stageConfig}
      farmsLoadFailed={farmsLoadFailed}
    >
      {children}
    </AppShell>
  );
}

function AppLoading() {
  return (
    <main className="min-h-screen bg-bg px-6 pt-9 text-text">
      <p className="text-sm text-muted">Loading…</p>
    </main>
  );
}
