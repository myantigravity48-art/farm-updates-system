"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

type TabId = "stages" | "notes" | "photos";

const tabs: Array<{ id: TabId; label: string; desktopHidden?: boolean }> = [
  { id: "stages", label: "Stages", desktopHidden: true },
  { id: "notes", label: "Notes" },
  { id: "photos", label: "Photos" },
];

/**
 * One tab widget: Stages, Notes and Photos on small screens; the desktop
 * layout always shows the timeline and the tabs only choose Notes or Photos.
 */
export function FarmDetailTabs({
  timeline,
  notes,
  photos,
}: {
  timeline: ReactNode;
  notes: ReactNode;
  photos: ReactNode;
}) {
  const [active, setActive] = useState<TabId>("stages");
  const tabRefs = useRef<Record<TabId, HTMLButtonElement | null>>({
    stages: null,
    notes: null,
    photos: null,
  });

  // The desktop layout has no Stages tab. Move the selection to Notes so the
  // right column always has a visible, correctly labelled panel.
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const sync = () => {
      if (!media.matches) return;
      setActive((current) => (current === "stages" ? "notes" : current));
    };

    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, current: TabId) => {
    const order: TabId[] = window.matchMedia("(min-width: 1024px)").matches
      ? ["notes", "photos"]
      : ["stages", "notes", "photos"];

    const index = order.indexOf(current);
    if (index === -1) return;

    let nextIndex: number;

    switch (event.key) {
      case "ArrowRight":
        nextIndex = (index + 1) % order.length;
        break;
      case "ArrowLeft":
        nextIndex = (index - 1 + order.length) % order.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = order.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const next = order[nextIndex];
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className="mt-6 grid gap-4 min-[1024px]:mt-0 min-[1024px]:grid-cols-[minmax(0,1fr)_minmax(340px,400px)] min-[1024px]:items-start min-[1024px]:gap-6">
      <div
        role="tablist"
        aria-label="Farm record sections"
        className="flex gap-1 rounded-[10px] border border-border bg-raised p-1 min-[1024px]:col-start-2 min-[1024px]:row-start-1"
      >
        {tabs.map((tab) => {
          const selected = active === tab.id;
          return (
            <button
              key={tab.id}
              ref={(node) => {
                tabRefs.current[tab.id] = node;
              }}
              type="button"
              role="tab"
              id={`farm-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`farm-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(tab.id)}
              onKeyDown={(event) => onKeyDown(event, tab.id)}
              className={`flex min-h-11 flex-1 items-center justify-center rounded-[8px] px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                selected
                  ? "bg-surface font-medium text-text"
                  : "text-muted hover:text-text"
              } ${tab.desktopHidden ? "min-[1024px]:hidden" : ""}`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <section
        role="tabpanel"
        id="farm-panel-stages"
        aria-labelledby="farm-tab-stages"
        tabIndex={0}
        className={`${active === "stages" ? "block" : "hidden"} min-[1024px]:col-start-1 min-[1024px]:row-span-2 min-[1024px]:row-start-1 min-[1024px]:block`}
      >
        {timeline}
      </section>

      <section
        role="tabpanel"
        id="farm-panel-notes"
        aria-labelledby="farm-tab-notes"
        tabIndex={0}
        className={`${
          active === "notes" ? "block" : active === "stages" ? "hidden min-[1024px]:block" : "hidden"
        } min-[1024px]:col-start-2 min-[1024px]:row-start-2`}
      >
        {notes}
      </section>

      <section
        role="tabpanel"
        id="farm-panel-photos"
        aria-labelledby="farm-tab-photos"
        tabIndex={0}
        className={`${active === "photos" ? "block" : "hidden"} min-[1024px]:col-start-2 min-[1024px]:row-start-2`}
      >
        {photos}
      </section>
    </div>
  );
}
