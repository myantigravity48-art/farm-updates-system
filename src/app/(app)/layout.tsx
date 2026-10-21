import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { ConfigError } from "@/components/auth/config-error";
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

  return <AppShell email={session.user.email}>{children}</AppShell>;
}

function AppLoading() {
  return (
    <main className="min-h-screen bg-bg px-6 pt-9 text-text">
      <p className="text-sm text-muted">Loading…</p>
    </main>
  );
}
