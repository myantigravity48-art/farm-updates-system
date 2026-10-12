import { PageHeader } from "@/components/page-header";
import { StatusPill, type StatusVariant } from "@/components/status-pill";

const tokens = ["bg", "surface", "raised", "border", "text", "muted", "primary", "on-primary", "due-soon", "overdue"] as const;
const statuses: StatusVariant[] = ["on-track", "due-soon", "overdue", "done"];

function ThemeSwatches({ theme }: { theme: "dark" | "light" }) {
  return (
    <section className={theme}>
      <h2 className="mb-4 font-display text-2xl font-light capitalize">{theme} theme</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {tokens.map((token) => <div key={token} className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="h-14 border-b border-border" style={{ backgroundColor: `var(--${token})` }} />
          <div className="p-3"><p className="text-sm">{token}</p><code className="text-xs text-muted">var(--{token})</code></div>
        </div>)}
      </div>
      <div className="mt-5 rounded-xl border border-border bg-surface p-5">
        <h3 className="font-display text-3xl font-light">Fraunces Light 300</h3>
        <p className="mt-2 font-sans text-base">Geist 400 · The quick brown fox jumps over 1234567890.</p>
        <p className="mt-1 font-sans text-base font-medium tabular-nums">Geist 500 · 12,345.67 · 28 Oct 2026</p>
        <div className="mt-5 flex flex-wrap gap-2">{statuses.map((status) => <StatusPill key={status} status={status} />)}</div>
      </div>
    </section>
  );
}

export default function TokensPage() {
  return <>
    <PageHeader title="Design tokens" />
    <div className="space-y-10"><ThemeSwatches theme="dark" /><ThemeSwatches theme="light" /></div>
  </>;
}
