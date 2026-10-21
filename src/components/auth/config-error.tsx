import { AlertCircle } from "lucide-react";

export function ConfigError({ variable }: { variable: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-6 text-text">
      <div className="w-full max-w-[560px] rounded-[14px] border border-overdue bg-surface p-6">
        <h1 className="flex items-center gap-2 font-display text-2xl font-light">
          <AlertCircle aria-hidden="true" size={22} strokeWidth={1.5} className="text-overdue" />
          The app is not configured
        </h1>
        <p className="mt-4 text-base">
          Missing environment variable:{" "}
          <code className="rounded bg-raised px-1.5 py-0.5 text-sm">{variable}</code>
        </p>
        <p className="mt-2 text-base text-muted">
          Add it to <code className="rounded bg-raised px-1.5 py-0.5 text-sm">.env.local</code> and restart the app.
        </p>
      </div>
    </main>
  );
}
