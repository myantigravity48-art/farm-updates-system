"use client";

import Link from "next/link";
import { AlertCircle, Check, ChevronRight, Clock3, type LucideIcon } from "lucide-react";
import { SeasonTimelineStrip } from "@/components/dashboard/season-timeline-strip";
import { StatusPill } from "@/components/status-pill";
import { formatUkShortDate } from "@/lib/format/dates";
import type {
  AttentionList,
  ComingUpRow,
  DashboardModel,
  ProgressList,
} from "@/lib/data/build-dashboard";
import { useMarkDone } from "@/components/mark-done/mark-done-provider";

const kpiTones = {
  overdue: "text-overdue",
  "due-soon": "text-due-soon",
} as const;

function KpiCard({
  label,
  value,
  tone,
  Icon,
}: {
  label: string;
  value: number;
  tone?: keyof typeof kpiTones;
  Icon?: LucideIcon;
}) {
  const valueClass = tone ? kpiTones[tone] : "text-text";
  const iconClass = tone ? kpiTones[tone] : "text-muted";

  return (
    <div className="rounded-[14px] border border-border bg-surface p-4 min-[768px]:p-5">
      <p className="flex items-center gap-1.5 text-sm text-muted">
        {Icon ? <Icon aria-hidden="true" size={16} strokeWidth={1.6} className={iconClass} /> : null}
        {label}
      </p>
      <p
        className={`mt-2 font-display text-4xl font-light tabular-nums min-[768px]:mt-3 min-[768px]:text-5xl ${valueClass}`}
      >
        {value}
      </p>
    </div>
  );
}

const attentionEdgeClasses = {
  overdue: "bg-overdue",
  "due-soon": "bg-due-soon",
} as const;

function AttentionRow({ row }: { row: AttentionList["rows"][number] }) {
  const { openMarkDone } = useMarkDone();
  return (
    <div className="relative flex min-h-16 items-center gap-2 overflow-hidden rounded-[10px] bg-raised pl-5 pr-2 hover:bg-border/40">
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 w-1 ${attentionEdgeClasses[row.status]}`}
      />
      <Link href={`/farms/${row.farmId}`} className="flex min-h-14 min-w-0 flex-1 flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2">
        <span className="min-w-0">
          <span className="block font-display text-lg font-light leading-tight">{row.farmName}</span>
          <span className="block text-sm text-muted">{row.stageName}</span>
        </span>
        <StatusPill status={row.status} label={row.phrase} />
      </Link>
      <button type="button" disabled={!row.stageId} onClick={() => openMarkDone(row.stageId)} aria-label={`Mark ${row.stageName} done on ${row.farmName}`} className="flex h-11 w-11 flex-none items-center justify-center rounded-[10px] text-primary hover:bg-surface disabled:opacity-50">
        <Check aria-hidden="true" size={20} strokeWidth={1.7} />
      </button>
    </div>
  );
}

function ProgressRowItem({ row }: { row: ProgressList["rows"][number] }) {
  return (
    <li className="py-3">
      <div className="flex items-baseline justify-between gap-3">
        <Link
          href={`/farms/${row.id}`}
          className="inline-flex min-h-11 items-center font-display text-lg font-light hover:underline"
        >
          {row.name}
        </Link>
        <span className="text-sm text-muted tabular-nums">
          {row.doneCount} of {row.totalStages} stages
        </span>
      </div>
      {row.totalStages > 0 ? (
        <div aria-hidden="true" className="mt-1 flex gap-1">
          {Array.from({ length: row.totalStages }, (_, index) => (
            <span
              key={index}
              className={`h-2 flex-1 rounded-full ${index < row.doneCount ? "bg-primary" : "bg-raised"}`}
            />
          ))}
        </div>
      ) : null}
    </li>
  );
}

function ComingUpRowLink({ row }: { row: ComingUpRow }) {
  return (
    <Link
      href={`/farms/${row.farmId}`}
      className="flex min-h-14 items-center gap-3 rounded-[10px] px-2 hover:bg-raised"
    >
      <span className="w-[7.5rem] flex-none text-sm font-medium tabular-nums">
        {formatUkShortDate(row.date)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm leading-tight">{row.stageName}</span>
        <span className="block truncate text-sm leading-tight text-muted">{row.farmName}</span>
      </span>
      <ChevronRight aria-hidden="true" size={18} strokeWidth={1.5} className="flex-none text-muted" />
    </Link>
  );
}

export function DashboardScreen({
  model,
}: {
  model: DashboardModel;
}) {
  const { kpis, attention, progress, comingUp, timeline } = model;

  return (
    <div>
      <section aria-label="This week at a glance" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Overdue" value={kpis.overdue} tone="overdue" Icon={AlertCircle} />
        <KpiCard label="Next 14 days" value={kpis.dueSoon} tone="due-soon" Icon={Clock3} />
        <KpiCard label="Done this month" value={kpis.doneThisMonth} />
        <KpiCard label="Farms" value={kpis.farms} />
      </section>

      <div className="mt-4 grid gap-4 lg:items-start lg:grid-cols-[3fr_2fr]">
        <div className="space-y-4">
          <section
            aria-labelledby="attention-heading"
            className="rounded-[14px] border border-border bg-surface p-4 min-[768px]:p-5"
          >
            <h2 id="attention-heading" className="font-display text-2xl font-light">
              Needs attention
            </h2>
            {attention.rows.length === 0 ? (
              <div className="mt-4 rounded-[10px] border border-dashed border-border px-4 py-8 text-center">
                <p className="font-display text-xl font-light">Nothing needs attention</p>
                <p className="mt-2 text-sm text-muted">Everything is on schedule.</p>
              </div>
            ) : (
              <>
                <ul className="mt-4 space-y-2">
                  {attention.rows.map((row) => (
                    <li key={`${row.farmId}-${row.stageName}`}>
                      <AttentionRow row={row} />
                    </li>
                  ))}
                </ul>
                {attention.extraCount > 0 ? (
                  <p className="mt-3 text-sm text-muted tabular-nums">
                    + {attention.extraCount} more
                  </p>
                ) : null}
              </>
            )}
          </section>

          <section
            aria-labelledby="progress-heading"
            className="rounded-[14px] border border-border bg-surface p-4 min-[768px]:p-5"
          >
            <h2 id="progress-heading" className="font-display text-2xl font-light">
              Farm progress
            </h2>
            <ul className="mt-2 divide-y divide-border">
              {progress.rows.map((row) => (
                <ProgressRowItem key={row.id} row={row} />
              ))}
            </ul>
            {progress.total > progress.rows.length ? (
              <Link
                href="/farms"
                className="mt-1 inline-flex min-h-11 items-center text-sm text-primary hover:underline"
              >
                View all {progress.total} farms
              </Link>
            ) : null}
          </section>
        </div>

        <div className="space-y-4">
          <section
            aria-labelledby="season-heading"
            className="rounded-[14px] border border-border bg-surface p-4 min-[768px]:p-5"
          >
            <h2 id="season-heading" className="font-display text-2xl font-light">
              Season timeline
            </h2>
            <div className="mt-4">
              <SeasonTimelineStrip timeline={timeline} />
            </div>
          </section>

          <section
            aria-labelledby="coming-up-heading"
            className="rounded-[14px] border border-border bg-surface p-4 min-[768px]:p-5"
          >
            <h2 id="coming-up-heading" className="font-display text-2xl font-light">
              Coming up
            </h2>
            {comingUp.length === 0 ? (
              <p className="mt-4 text-sm text-muted">Jobs appear here once they are scheduled.</p>
            ) : (
              <ul className="mt-2">
                {comingUp.map((row) => (
                  <li key={`${row.farmId}-${row.stageName}-${row.date}`}>
                    <ComingUpRowLink row={row} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
