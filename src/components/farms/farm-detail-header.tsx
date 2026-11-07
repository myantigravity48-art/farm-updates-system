import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { FarmDetailActions } from "@/components/farms/farm-detail-actions";
import { StatusPill } from "@/components/status-pill";
import type { FarmDetailView } from "@/lib/data/types";

export function FarmDetailHeader({ farm }: { farm: FarmDetailView }) {
  const total = farm.totalStages;

  return (
    <header className="mb-6 min-[1024px]:mb-8">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted">
        <Link
          href="/farms"
          className="inline-flex min-h-11 items-center hover:text-text hover:underline"
        >
          Farms
        </Link>
        <ChevronRight aria-hidden="true" size={16} strokeWidth={1.5} className="flex-none" />
        <span aria-current="page" className="min-w-0 truncate text-text">
          {farm.name}
        </span>
      </nav>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
            Farm record
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="font-display text-4xl font-light leading-none tracking-tight min-[1024px]:text-5xl">
              {farm.name}
            </h1>
            <StatusPill status={farm.status} />
          </div>
          <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
            <span>{farm.location ?? "Location not set"}</span>
            <span>{farm.sizeLabel ?? "Size not set"}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <FarmDetailActions
            nextStageId={farm.stages.find((stage) => stage.state !== "done")?.id ?? null}
            allStagesDone={farm.doneCount === farm.totalStages}
            farm={{
              id: farm.id,
              name: farm.name,
              location: farm.location,
              sizeValue: farm.sizeValue,
              sizeUnit: farm.sizeUnit,
              notes: farm.farmNotes,
            }}
          />
        </div>
      </div>

      <div className="mt-5">
        <div aria-hidden="true" className="flex gap-1">
          {Array.from({ length: total }, (_, index) => (
            <span
              key={index}
              className={`h-2 flex-1 rounded-full ${
                index < farm.doneCount ? "bg-primary" : "bg-raised"
              }`}
            />
          ))}
        </div>
        <p className="mt-2 text-sm text-muted tabular-nums">
          {farm.doneCount} of {total} stages
        </p>
      </div>
    </header>
  );
}
