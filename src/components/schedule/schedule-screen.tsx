"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check } from "lucide-react";
import { useMarkDone } from "@/components/mark-done/mark-done-provider";
import { StatusPill, type StatusVariant } from "@/components/status-pill";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { ScheduleFilterStatus, SchedulePageGroup, SchedulePageRow } from "@/lib/schedule-page/build-schedule-page";

const edgeClass: Record<SchedulePageRow["status"], string> = {
  overdue: "bg-overdue",
  due_soon: "bg-due-soon",
  on_track: "bg-primary",
  done: "bg-muted",
  unscheduled: "bg-muted",
};

const variant: Record<SchedulePageRow["status"], StatusVariant> = {
  overdue: "overdue",
  due_soon: "due-soon",
  on_track: "on-track",
  done: "done",
  unscheduled: "unscheduled",
};

const filters: Array<{ value: ScheduleFilterStatus; label: string }> = [
  { value: "all", label: "All" },
  { value: "overdue", label: "Overdue" },
  { value: "due-soon", label: "Due soon" },
  { value: "upcoming", label: "Upcoming" },
];

function ScheduleRow({ row }: { row: SchedulePageRow }) {
  const { openMarkDone } = useMarkDone();
  return (
    <li className="relative min-w-0 rounded-[10px] bg-raised pl-5 pr-3 hover:bg-border/40">
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${edgeClass[row.status]}`} />
      <div className="flex min-h-[72px] min-w-0 flex-wrap items-center gap-x-4 gap-y-2 py-3 max-[639px]:flex-col max-[639px]:items-stretch">
        <Link href={`/farms/${row.farmId}`} className="flex min-h-11 min-w-0 flex-1 flex-col justify-center [overflow-wrap:anywhere] focus-visible:rounded-md">
          <span className="font-display text-lg font-light leading-tight">{row.farmName}</span>
          <span className="text-sm text-muted [overflow-wrap:anywhere]">{row.stageName}</span>
        </Link>
        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-3 gap-y-2 max-[639px]:w-full max-[639px]:flex-col max-[639px]:items-start">
          <p className="min-w-0 text-sm text-muted [overflow-wrap:anywhere]">
            {row.dateText}
            {row.isOverrideDate ? <span className="block">Date set manually</span> : null}
          </p>
          <div className="flex min-w-0 flex-wrap items-center gap-2 max-[639px]:w-full">
            <StatusPill status={variant[row.status]} label={row.phrase} />
            {row.canMarkDone ? (
              <button type="button" onClick={() => openMarkDone(row.farmStageId)} aria-label={`Mark ${row.stageName} done on ${row.farmName}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-border bg-surface px-3 text-sm font-medium text-text hover:bg-raised">
                <Check aria-hidden="true" size={17} strokeWidth={1.7} />
                Mark done
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
}

function ScheduleGroup({ group }: { group: SchedulePageGroup }) {
  const content = <ul className="mt-3 min-w-0 space-y-2">{group.rows.map((row) => <ScheduleRow key={`${row.farmId}-${row.farmStageId ?? row.position}`} row={row} />)}</ul>;
  if (group.collapsed) {
    return <details className="min-w-0 rounded-[14px] border border-border bg-surface p-4 min-[768px]:p-5">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 font-display text-2xl font-light focus-visible:rounded-md">
        <span>{group.label}</span><span className="font-sans text-sm text-muted tabular-nums">{group.count}</span>
      </summary>
      {content}
    </details>;
  }
  return <section aria-labelledby={`schedule-group-${group.label.replaceAll(" ", "-")}`} className="min-w-0 rounded-[14px] border border-border bg-surface p-4 min-[768px]:p-5">
    <h2 id={`schedule-group-${group.label.replaceAll(" ", "-")}`} className="flex items-baseline justify-between gap-3 font-display text-2xl font-light">
      <span>{group.label}</span><span className="font-sans text-sm text-muted tabular-nums">{group.count}</span>
    </h2>
    {content}
  </section>;
}

export function ScheduleScreen({
  groups,
  farmOptions,
  selectedFarmId,
  selectedStatus,
  showCompleted,
}: {
  groups: SchedulePageGroup[];
  farmOptions: Array<{ id: string; name: string }>;
  selectedFarmId: string | null;
  selectedStatus: ScheduleFilterStatus;
  showCompleted: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const updateFilter = (key: string, value: string | null) => {
    const query = new URLSearchParams(searchParams.toString());
    if (value) query.set(key, value);
    else query.delete(key);
    const suffix = query.toString();
    router.push(suffix ? `${pathname}?${suffix}` : pathname, { scroll: false });
  };
  const hasFarms = farmOptions.length > 0;
  const noResults = hasFarms && groups.length === 0 && (selectedFarmId !== null || selectedStatus !== "all" || showCompleted);
  const hasScheduled = groups.some((group) => group.label !== "Not scheduled yet" && group.label !== "Recently completed");

  return (
    <div className="mx-auto w-full min-w-0 max-w-[960px]">
      <header className="mb-6 min-[768px]:mb-8">
        <h1 className="font-display text-4xl font-light tracking-tight min-[768px]:text-5xl">Schedule</h1>
        <p className="mt-3 text-sm text-muted">Every job across all farms, in date order.</p>
      </header>

      {hasFarms ? <section aria-label="Schedule filters" className="mb-6 flex min-w-0 flex-wrap items-end gap-3 rounded-[14px] border border-border bg-surface p-4">
        <label className="flex min-w-[160px] flex-1 flex-col gap-1 text-sm text-muted">
          Farm
          <select value={selectedFarmId ?? ""} onChange={(event) => updateFilter("farmId", event.target.value || null)} className="min-h-11 min-w-0 w-full rounded-[10px] border border-border bg-bg px-3 text-text">
            <option value="">All farms</option>
            {farmOptions.map((farm) => <option key={farm.id} value={farm.id}>{farm.name}</option>)}
          </select>
        </label>
        <div role="group" aria-label="Filter by status" className="flex min-w-0 flex-1 flex-wrap gap-2">
          {filters.map((filter) => <button key={filter.value} type="button" aria-pressed={selectedStatus === filter.value} onClick={() => updateFilter("status", filter.value === "all" ? null : filter.value)} className={`min-h-11 rounded-full border px-4 text-sm ${selectedStatus === filter.value ? "border-primary bg-raised text-text" : "border-border bg-bg text-muted hover:bg-raised"}`}>
            {filter.label}
          </button>)}
        </div>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-[10px] px-2 text-sm">
          <input type="checkbox" role="switch" aria-checked={showCompleted} checked={showCompleted} onChange={(event) => updateFilter("showCompleted", event.target.checked ? "true" : null)} className="h-5 w-5 accent-primary" />
          <span>Show completed</span>
        </label>
      </section> : null}

      {!hasFarms ? (
        <EmptyState
          title="No farms yet"
          description="Add a farm to start its schedule."
          action={<Link href="/farms" className={buttonClass("secondary")}>Add farm</Link>}
        />
      ) : null}

      {noResults ? <div aria-live="polite">
        <EmptyState
          title="No jobs match these filters"
          description="Try a different farm or status."
          action={<button type="button" onClick={() => router.push("/schedule", { scroll: false })} className={buttonClass("secondary")}>Clear filters</button>}
        />
      </div> : null}

      {hasFarms && hasScheduled ? <div aria-live="polite" className="min-w-0 space-y-6 min-[768px]:space-y-8">
        {groups.map((group) => <ScheduleGroup key={group.label} group={group} />)}
      </div> : null}

      {hasFarms && !hasScheduled && !noResults ? <div aria-live="polite" className="min-w-0 space-y-6 min-[768px]:space-y-8">
        <EmptyState
          title="Nothing scheduled yet"
          description="Mark planting done on a farm to schedule its later jobs."
          action={<Link href="/farms" className={buttonClass("secondary")}>Go to farms</Link>}
        />
        {groups.map((group) => <ScheduleGroup key={group.label} group={group} />)}
      </div> : null}
    </div>
  );
}
