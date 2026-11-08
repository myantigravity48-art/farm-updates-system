import { AlertsScreen } from "@/components/alerts/alerts-screen";
import { getAlertsPageData } from "@/lib/data/alerts";

export default async function AlertsPage() {
  let data: Awaited<ReturnType<typeof getAlertsPageData>> | null = null;
  let message: string | null = null;
  try {
    data = await getAlertsPageData();
  } catch (error) {
    message = error instanceof Error ? error.message : "Could not load alert settings. Refresh the page and try again.";
  }
  if (data) return <AlertsScreen data={data} />;
  return (
    <main className="mx-auto w-full max-w-[720px] pb-24 pt-8 min-[768px]:pt-10">
      <header className="mb-8">
        <h1 className="font-display text-4xl font-light tracking-tight">Alerts</h1>
        <p className="mt-3 text-muted">Choose who receives email alerts and when they arrive.</p>
      </header>
      <div role="alert" className="rounded-[14px] border border-overdue/40 bg-surface p-5 text-text">
        <p>{message}</p>
      </div>
    </main>
  );
}
