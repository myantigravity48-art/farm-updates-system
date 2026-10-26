import type { Status } from "@/lib/schedule";
import { StatusPill, statusIcons, type StatusVariant } from "@/components/status-pill";
import type { StageRow } from "@/lib/data/build-stage-rows";

const pillStatus: Record<Status, StatusVariant> = {
  done: "done",
  unscheduled: "unscheduled",
  on_track: "on-track",
  due_soon: "due-soon",
  overdue: "overdue",
};

const markerClass: Record<Status, string> = {
  done: "border-border text-muted",
  unscheduled: "border-border text-muted",
  on_track: "border-primary text-primary",
  due_soon: "border-due-soon text-due-soon",
  overdue: "border-overdue text-overdue",
};

export function StageTimeline({ rows }: { rows: StageRow[] }) {
  return (
    <section
      aria-labelledby="stage-timeline-heading"
      className="rounded-[14px] border border-border bg-surface"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-4 min-[768px]:px-5">
        <h2 id="stage-timeline-heading" className="font-display text-2xl font-light">
          Crop lifecycle
        </h2>
        <p className="text-sm text-muted tabular-nums">{rows.length} stages</p>
      </header>

      {rows.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted min-[768px]:px-5">No stages yet.</p>
      ) : (
        <ol className="px-2 py-2 min-[768px]:px-3">
          {rows.map((row, index) => {
            const variant = pillStatus[row.state];
            const Icon = statusIcons[variant];
            const done = row.state === "done";

            return (
              <li
                key={row.position}
                className={`relative flex gap-3 rounded-[10px] px-2 py-3 ${
                  row.nextUp ? "bg-raised" : ""
                }`}
              >
                <div className="flex w-7 flex-none flex-col items-center">
                  <span
                    className={`flex h-7 w-7 flex-none items-center justify-center rounded-full border ${markerClass[row.state]}`}
                  >
                    <Icon aria-hidden="true" size={15} strokeWidth={1.7} />
                  </span>
                  {index < rows.length - 1 ? (
                    <span aria-hidden="true" className="mt-1 w-px flex-1 bg-border" />
                  ) : null}
                </div>

                <div className="min-w-0 flex-1 pb-1">
                  <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                    <p
                      className={`min-w-0 text-base leading-tight ${
                        done ? "text-muted" : "text-text"
                      } ${row.nextUp ? "font-medium" : ""}`}
                    >
                      <span className="mr-2 text-muted tabular-nums">
                        {String(row.position).padStart(2, "0")}
                      </span>
                      {row.name}
                    </p>
                    <span className="flex-none">
                      <StatusPill status={variant} label={row.pillLabel} />
                    </span>
                  </div>

                  <p
                    className={`mt-1.5 text-sm tabular-nums ${
                      done ? "text-muted" : "text-text"
                    }`}
                  >
                    {row.dateText}
                  </p>
                  <p className="mt-1 text-sm text-muted">{row.ruleText}</p>

                  {row.nextUp ? (
                    <p className="mt-2 text-sm font-medium text-primary">Next up</p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
