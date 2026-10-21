import Link from "next/link";
import { StatusPill } from "@/components/status-pill";
import type { FarmSummary } from "@/lib/data/types";

export function FarmCard({ farm }: { farm: FarmSummary }) {
  const meta = [farm.location, farm.sizeLabel].filter(Boolean).join(" · ");

  return (
    <Link
      href={`/farms/${farm.id}`}
      className="flex flex-col rounded-[14px] border border-border bg-surface p-5 hover:bg-raised"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-display text-2xl font-light">{farm.name}</h2>
          {meta ? <p className="mt-1 text-sm text-muted">{meta}</p> : null}
        </div>
        <StatusPill status={farm.status} />
      </div>

      <div className="mt-5">
        <div className="flex gap-1" aria-hidden="true">
          {Array.from({ length: farm.totalStages }, (_, index) => (
            <span
              key={index}
              className={`h-1.5 flex-1 rounded-full ${
                index < farm.doneCount ? "bg-primary" : "bg-raised"
              }`}
            />
          ))}
        </div>
        <p className="mt-2 text-sm text-muted tabular-nums">
          {farm.doneCount} of {farm.totalStages} stages
        </p>
      </div>

      <p className="mt-4 text-sm text-text">
        {farm.nextStageName && farm.nextDueLabel
          ? `${farm.nextStageName}, due ${farm.nextDueLabel}`
          : farm.status === "done"
            ? "All stages done"
            : "No next job scheduled"}
      </p>
    </Link>
  );
}
