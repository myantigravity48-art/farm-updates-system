"use client";

import Link from "next/link";
import { AlertCircle, Check, ChevronRight, Clock3, type LucideIcon } from "lucide-react";
import { SeasonTimelineStrip } from "@/components/dashboard/season-timeline-strip";
import { StatusPill } from "@/components/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { Section, SectionStack } from "@/components/ui/section";
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
    <div className="min-w-0 rounded-[14px] border border-border bg-surface p-4 min-[768px]:p-5">
      <p className="flex items-center gap-1.5 text-sm text-muted">
        {Icon ? <Icon aria-hidden="true" size={16} strokeWidth={1.6} className={iconClass} /> : null}
        {label}
      </p>
      <p
        className={`mt-2 font-display text-4xl font-light numeric min-[768px]:mt-3 min-[768px]:text-5xl ${valueClass}`}
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
    <div className="relative flex min-h-16 items-center gap-2 rounded-[10px] bg-raised pl-5 pr-2 hover:bg-border/40">
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 w-1 ${attentionEdgeClasses[row.status]}`}
      />
      <Link href={`/farms/${row.farmId}`} className="flex min-h-14 min-w-0 flex-1 flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2">
        <span className="min-w-0">
          <span className="block font-display text-lg font-light leading-tight [overflow-wrap:anywhere]">{row.farmName}</span>
          <span className="block text-sm text-muted [overflow-wrap:anywhere]">{row.stageName}</span>
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
    <li className="min-w-0 py-3">
      <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <Link
          href={`/farms/${row.id}`}
          className="inline-flex min-h-11 min-w-0 flex-1 items-center font-display text-lg font-light hover:underline [overflow-wrap:anywhere]"
        >
          {row.name}
        </Link>
        <span className="min-w-0 text-sm text-muted numeric">
          {row.doneCount} of {row.totalStages} stages
        </span>
      </div>
      {row.totalStages > 0 ? (
        <div aria-hidden="true" className="mt-1 flex min-w-0 gap-1">
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
      <span className="w-[7.5rem] flex-none text-sm font-medium numeric">
        {formatUkShortDate(row.date)}
      </span>
      <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
        <span className="block text-sm leading-tight [overflow-wrap:anywhere]">{row.stageName}</span>
        <span className="block text-sm leading-tight text-muted [overflow-wrap:anywhere]">{row.farmName}</span>
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
    <SectionStack>
      {/*
        Under 1024px the grid is one column and the two wrappers use
        display: contents, so Needs attention reads first, the four metrics
        follow as a 2x2 summary, then the rest. At 1024px and up the wrappers
        become the same two independent columns as before, with the metrics
        back above them.
      */}
      <div className="grid min-w-0 gap-6 min-[768px]:gap-8 lg:grid-cols-[3fr_2fr] lg:items-start">
        <section aria-label="This week at a glance" className="order-2 grid grid-cols-2 gap-4 min-[768px]:gap-6 lg:order-1 lg:col-span-2 lg:grid-cols-4">
          <KpiCard label="Overdue" value={kpis.overdue} tone="overdue" Icon={AlertCircle} />
          <KpiCard label="Next 14 days" value={kpis.dueSoon} tone="due-soon" Icon={Clock3} />
          <KpiCard label="Done this month" value={kpis.doneThisMonth} />
          <KpiCard label="Farms" value={kpis.farms} />
        </section>

        <div className="contents lg:order-2 lg:col-start-1 lg:row-start-2 lg:block lg:min-w-0 lg:space-y-8">
          <Section aria-labelledby="attention-heading" className="order-1 lg:order-none">
            <h2 id="attention-heading" className="font-display text-2xl font-normal">
              Needs attention
            </h2>
            {attention.rows.length === 0 ? (
              <EmptyState className="mt-4" title="Nothing needs attention" description="Everything is on schedule." />
            ) : (
              <>
                <ul className="mt-4 space-y-2">
                  {attention.rows.map((row) => (
                    <li key={`${row.farmId}-${row.stageName}`} className="min-w-0">
                      <AttentionRow row={row} />
                    </li>
                  ))}
                </ul>
                {attention.extraCount > 0 ? (
                  kpis.overdue > 0 ? (
                    <Link href="/schedule?status=overdue" className="mt-3 inline-flex min-h-11 items-center text-sm text-primary hover:underline numeric">
                      + {attention.extraCount} more
                    </Link>
                  ) : (
                    <p className="mt-3 text-sm text-muted numeric">+ {attention.extraCount} more</p>
                  )
                ) : null}
              </>
            )}
          </Section>

          <Section aria-labelledby="progress-heading" className="order-3 lg:order-none">
            <h2 id="progress-heading" className="font-display text-2xl font-normal">
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
          </Section>
        </div>

        <div className="contents lg:order-3 lg:col-start-2 lg:row-start-2 lg:block lg:min-w-0 lg:space-y-8">
          <Section aria-labelledby="season-heading" className="order-4 lg:order-none">
            <h2 id="season-heading" className="font-display text-2xl font-normal">
              Season timeline
            </h2>
            <div className="mt-4">
              <SeasonTimelineStrip timeline={timeline} />
            </div>
          </Section>

          <Section aria-labelledby="coming-up-heading" className="order-5 lg:order-none">
            <h2 id="coming-up-heading" className="font-display text-2xl font-normal">
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
            <Link href="/schedule" className="mt-2 inline-flex min-h-11 items-center text-sm text-primary hover:underline">
              View full schedule
            </Link>
          </Section>
        </div>
      </div>
    </SectionStack>
  );
}
