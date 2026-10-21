"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CalendarDays, LayoutDashboard, Leaf, Search, Settings, Sprout } from "lucide-react";
import { useMemo, useState } from "react";
import { farms } from "@/mocks/farms";
import { StatusDot } from "@/components/status-dot";
import { ThemeToggle } from "@/components/theme-toggle";

const primaryLinks = [
  { href: "/", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/farms", label: "Farms", Icon: Sprout },
  { href: "/schedule", label: "Schedule", Icon: CalendarDays },
  { href: "/alerts", label: "Alerts", Icon: Bell },
];
const allLinks = [...primaryLinks, { href: "/settings", label: "Settings", Icon: Settings }];
const farmStatusLabels = { "on-track": "On track", "due-soon": "Due soon", overdue: "Overdue", done: "Done" } as const;

function activeFor(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children, email }: { children: React.ReactNode; email: string }) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const showFarmPanel = pathname === "/" || pathname === "/farms" || pathname.startsWith("/farms/");
  const visibleFarms = useMemo(() => farms.filter((farm) => farm.name.toLowerCase().includes(query.toLowerCase())), [query]);

  return (
    <div className="min-h-screen bg-bg text-text">
      <aside aria-label="Primary navigation" className="fixed inset-y-0 left-0 z-20 hidden w-[72px] flex-col items-center border-r border-border bg-surface py-4 min-[768px]:flex">
        <Link href="/" aria-label="Farm updates system dashboard" className="mb-7 flex h-11 w-11 items-center justify-center rounded-xl border border-border text-primary focus-visible:outline-offset-2">
          <Leaf aria-hidden="true" size={21} strokeWidth={1.5} />
        </Link>
        <nav className="flex flex-col gap-2">
          {primaryLinks.map(({ href, label, Icon }) => {
            const active = activeFor(pathname, href);
            return <Link key={href} href={href} title={label} aria-label={label} aria-current={active ? "page" : undefined} className={`flex h-11 w-11 items-center justify-center rounded-xl focus-visible:outline-offset-2 ${active ? "bg-raised text-primary" : "text-muted hover:bg-raised hover:text-text"}`}>
              <Icon aria-hidden="true" size={21} strokeWidth={1.5} />
            </Link>;
          })}
        </nav>
        <div className="mt-auto flex flex-col items-center gap-2">
          <ThemeToggle />
          <Link href="/settings" title="Settings" aria-label="Settings" aria-current={activeFor(pathname, "/settings") ? "page" : undefined} className={`flex h-11 w-11 items-center justify-center rounded-xl ${activeFor(pathname, "/settings") ? "bg-raised text-primary" : "text-muted hover:bg-raised hover:text-text"}`}>
            <Settings aria-hidden="true" size={21} strokeWidth={1.5} />
          </Link>
        </div>
      </aside>

      {showFarmPanel && <aside aria-label="Farm list" className="fixed inset-y-0 left-[72px] z-10 hidden w-[248px] border-r border-border bg-surface px-4 py-7 min-[1024px]:block">
        <h2 className="mb-5 font-display text-2xl font-light">Farms</h2>
        <label className="flex h-11 items-center gap-2 rounded-[10px] border border-border bg-bg px-3 text-muted focus-within:outline focus-within:outline-2 focus-within:outline-primary focus-within:outline-offset-2">
          <Search aria-hidden="true" size={17} strokeWidth={1.5} />
          <span className="sr-only">Search farms</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search farms" className="min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-muted" />
        </label>
        <ul className="mt-4 space-y-1">
          {visibleFarms.map((farm) => <li key={farm.id}>
            <Link href={`/farms/${farm.id}`} className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 hover:bg-raised">
              <StatusDot status={farm.status} />
              <span className="flex flex-col">
                <span className="text-sm">{farm.name}</span>
                <span className="text-sm text-muted">{farmStatusLabels[farm.status]}</span>
              </span>
            </Link>
          </li>)}
          {visibleFarms.length === 0 && <li className="px-3 py-3 text-sm text-muted">No farms found</li>}
        </ul>
        <div className="mt-4 flex min-h-11 items-center gap-2 rounded-lg border border-dashed border-border px-3 text-sm text-muted">
          <span aria-hidden="true" className="text-lg leading-none">+</span> Add farm
        </div>
      </aside>}

      <main className={`min-h-screen px-6 pb-24 pt-5 min-[768px]:pb-10 min-[768px]:pl-[104px] min-[768px]:pt-9 min-[1024px]:pl-6 ${showFarmPanel ? "min-[1024px]:ml-[320px]" : ""}`}>
        <div className="mx-auto w-full max-w-[1200px]">
          <div className="mb-8 flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="mr-auto font-medium min-[768px]:hidden">Farm updates system</span>
            <div className="ml-auto flex min-w-0 items-center gap-2">
              <Link
                href="/settings"
                aria-label={`Settings, signed in as ${email}`}
                className="flex min-h-11 min-w-0 items-center gap-2 rounded-[10px] px-2 text-sm text-muted hover:bg-raised hover:text-text"
              >
                <Settings aria-hidden="true" size={18} strokeWidth={1.5} />
                <span className="max-w-[160px] truncate min-[768px]:max-w-[260px]">{email}</span>
              </Link>
              <span className="min-[768px]:hidden">
                <ThemeToggle />
              </span>
            </div>
          </div>
          {children}
        </div>
      </main>

      <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-surface px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 min-[768px]:hidden">
        {allLinks.map(({ href, label, Icon }) => {
          const active = activeFor(pathname, href);
          return <Link key={href} href={href} aria-label={label} aria-current={active ? "page" : undefined} className={`flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg text-xs focus-visible:outline-offset-[-2px] ${active ? "text-primary" : "text-muted"}`}>
            <Icon aria-hidden="true" size={20} strokeWidth={1.5} />
            <span className="text-sm">{label}</span>
          </Link>;
        })}
      </nav>
    </div>
  );
}
