import Link from "next/link";
import { FarmDetailActions } from "@/components/farms/farm-detail-actions";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { getFarmById } from "@/lib/data/farms";
import { formatUkDate } from "@/lib/format/dates";

export default async function FarmDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const farm = await getFarmById(id);

  return (
    <>
      <PageHeader
        title={farm.name}
        description={farm.location ?? "Farm record"}
      />

      <div className="rounded-[14px] border border-border bg-surface p-5 min-[768px]:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <StatusPill status={farm.status} />
            <p className="mt-3 text-sm text-muted tabular-nums">
              {farm.doneCount} of {farm.totalStages} stages done
            </p>
          </div>
          <FarmDetailActions
            farm={{
              id: farm.id,
              name: farm.name,
              location: farm.location,
              sizeValue: farm.sizeValue,
              sizeUnit: farm.sizeUnit,
              notes: farm.notes,
            }}
          />
        </div>

        <div className="mt-6 flex gap-1" aria-hidden="true">
          {Array.from({ length: farm.totalStages }, (_, index) => (
            <span
              key={index}
              className={`h-1.5 flex-1 rounded-full ${
                index < farm.doneCount ? "bg-primary" : "bg-raised"
              }`}
            />
          ))}
        </div>

        <dl className="mt-6 grid gap-5 text-sm min-[640px]:grid-cols-2">
          <div>
            <dt className="text-muted">Size</dt>
            <dd className="mt-1">{farm.sizeLabel ?? "Not set"}</dd>
          </div>
          <div>
            <dt className="text-muted">Current stage</dt>
            <dd className="mt-1">{farm.currentStageName ?? "All stages done"}</dd>
          </div>
          <div>
            <dt className="text-muted">Next job</dt>
            <dd className="mt-1">
              {farm.nextStageName && farm.nextDueLabel
                ? `${farm.nextStageName}, due ${farm.nextDueLabel}`
                : "None scheduled"}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Planting date</dt>
            <dd className="mt-1">
              {farm.plantingDate ? formatUkDate(farm.plantingDate) : "Not set"}
            </dd>
          </div>
        </dl>

        {farm.notes ? (
          <div className="mt-6 border-t border-border pt-5">
            <h2 className="text-sm text-muted">Notes</h2>
            <p className="mt-2 whitespace-pre-line text-sm">{farm.notes}</p>
          </div>
        ) : null}
      </div>

      <p className="mt-5 text-sm text-muted">
        Stage timeline, notes and photos are coming soon.{" "}
        <Link href="/farms" className="text-primary hover:underline">
          Back to farms
        </Link>
      </p>
    </>
  );
}
