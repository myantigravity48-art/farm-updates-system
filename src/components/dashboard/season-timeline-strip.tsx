import type { SeasonTimeline } from "@/lib/data/timeline";

const MONTH_ABBREVIATIONS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Keeps the floating "Today" label inside the strip on narrow screens. */
function markerPosition(percent: number): number {
  return Math.min(96, Math.max(4, percent));
}

export function SeasonTimelineStrip({ timeline }: { timeline: SeasonTimeline }) {
  const left = markerPosition(timeline.todayPercent);

  return (
    <div>
      <ul aria-hidden="true" className="flex text-[11px] leading-none text-muted">
        {MONTH_ABBREVIATIONS.map((month) => (
          <li key={month} className="flex-1">
            {month}
          </li>
        ))}
      </ul>
      <div role="img" aria-label={timeline.label} className="relative">
        <div
          aria-hidden="true"
          className="relative flex h-7 overflow-hidden rounded-full border border-border bg-bg"
        >
          {timeline.segments.map((segment) => (
            <span
              key={`${segment.key}-${segment.startPercent}`}
              style={{
                left: `${segment.startPercent}%`,
                width: `${segment.endPercent - segment.startPercent}%`,
              }}
              className={`absolute inset-y-0 ${
                segment.key === "dry_season" ? "bg-raised" : "bg-primary/38"
              }`}
            />
          ))}
          <span
            style={{ left: `${timeline.todayPercent}%` }}
            className="absolute inset-y-0 w-[2px] bg-text"
          />
        </div>
        <div aria-hidden="true" className="relative mt-1 h-4">
          <p
            style={{ left: `${left}%` }}
            className="absolute top-0 -translate-x-1/2 text-xs font-medium text-text"
          >
            Today
          </p>
        </div>
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-1">
        <li className="flex items-center gap-2 text-sm text-muted">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-[3px] border border-border bg-raised" />
          Dry season
        </li>
        <li className="flex items-center gap-2 text-sm text-muted">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-[3px] bg-primary/38" />
          Planting window
        </li>
      </ul>
    </div>
  );
}
