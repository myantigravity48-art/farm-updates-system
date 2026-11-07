"use client";

import { useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import type { CalendarDate, Status } from "@/lib/schedule";
import { StatusPill, statusIcons, type StatusVariant } from "@/components/status-pill";
import type { StageRow } from "@/lib/data/build-stage-rows";
import { availableActions, type StageAction } from "@/lib/mark-done/logic";
import { setPlantingDate, setStageDueOverride, undoStageDone } from "@/lib/mark-done/actions";
import { useMarkDone } from "@/components/mark-done/mark-done-provider";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { formatUkShortDate } from "@/lib/format/dates";

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

export function StageTimeline({ rows, farmId, today, plantingDate }: { rows: StageRow[]; farmId: string; today: CalendarDate; plantingDate: CalendarDate | null }) {
  const router = useRouter();
  const { openMarkDone, showToast } = useMarkDone();
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
                    <span className="flex flex-none items-center gap-1">
                      <StatusPill status={variant} label={row.pillLabel} />
                      {row.id ? <StageActions row={row} farmId={farmId} today={today} plantingDate={plantingDate} onMarkDone={() => openMarkDone(row.id)} onResult={(message) => { showToast(message); router.refresh(); }} /> : null}
                    </span>
                  </div>

                  <p
                    className={`mt-1.5 text-sm tabular-nums ${
                      done ? "text-muted" : "text-text"
                    }`}
                  >
                    {done ? `Done ${row.doneDate ? formatUkShortDate(row.doneDate) : "date not recorded"} by ${row.doneByName ?? "a user"}` : row.dateText}
                  </p>
                  {done && row.doneNote ? <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{row.doneNote}</p> : null}
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

function StageActions({ row, farmId, today, plantingDate, onMarkDone, onResult }: {
  row: StageRow;
  farmId: string;
  today: CalendarDate;
  plantingDate: CalendarDate | null;
  onMarkDone: () => void;
  onResult: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<"override" | "planting" | null>(null);
  const [date, setDate] = useState<string>(row.dueDateOverride ?? row.dueDate ?? today);
  const [error, setError] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const actions = availableActions({ position: row.position, name: row.name, isDone: row.state === "done", windowKey: row.windowKey, hasOverride: Boolean(row.dueDateOverride) });
  const labels: Record<StageAction, string> = {
    mark_done: "Mark done",
    set_date_manually: "Set date manually",
    use_schedule_date: "Use schedule date",
    mark_not_done: "Mark as not done",
    change_planting_date: "Change planting date",
  };

  const runAction = async (action: StageAction) => {
    setOpen(false);
    setError("");
    if (action === "mark_done") { onMarkDone(); return; }
    if (action === "set_date_manually") { setDate(row.dueDateOverride ?? row.dueDate ?? today); setDialog("override"); return; }
    if (action === "change_planting_date") { setDate(plantingDate ?? row.doneDate ?? today); setDialog("planting"); return; }
    if (action === "mark_not_done") {
      const detail = row.windowKey === "planting" ? "\nLater job dates will become unscheduled." : "";
      if (!window.confirm(`This stage will go back to not done.${detail}`)) return;
      const result = await undoStageDone(row.id!);
      onResult(result.ok ? "Stage marked not done." : result.message);
      return;
    }
    const result = await setStageDueOverride(row.id!, null);
    onResult(result.ok ? "Schedule date restored." : result.message);
  };

  const saveDate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = dialog === "planting"
      ? await setPlantingDate(farmId, date)
      : await setStageDueOverride(row.id!, date);
    if (!result.ok) { setError(result.message); return; }
    setDialog(null);
    onResult(result.message);
  };

  return (
    <>
      <div className="relative">
        <button ref={triggerRef} type="button" aria-label={`Actions for ${row.name}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)} onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setOpen(true); requestAnimationFrame(() => menuRef.current?.querySelector<HTMLButtonElement>("button")?.focus()); }
          if (event.key === "Escape") setOpen(false);
        }} className="flex h-11 w-11 items-center justify-center rounded-[10px] text-muted hover:bg-raised hover:text-text">
          <MoreHorizontal aria-hidden="true" size={20} />
        </button>
        {open ? <div ref={menuRef} role="menu" aria-label={`${row.name} actions`} onKeyDown={(event) => {
          const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? []);
          const index = items.indexOf(document.activeElement as HTMLButtonElement);
          if (event.key === "Escape") { event.preventDefault(); setOpen(false); triggerRef.current?.focus(); }
          if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); items[(index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus(); }
        }} className="absolute right-0 top-full z-20 mt-1 min-w-52 rounded-[10px] border border-border bg-surface p-1 shadow-lg">
          {actions.map((action) => <button key={action} type="button" role="menuitem" onClick={() => void runAction(action)} className="flex min-h-11 w-full items-center rounded-[8px] px-3 text-left text-sm hover:bg-raised">{labels[action]}</button>)}
        </div> : null}
      </div>
      {dialog ? <Modal onClose={() => setDialog(null)} labelledBy={`stage-date-heading-${row.position}`}>
        <form onSubmit={saveDate} className="flex flex-col">
          <header className="border-b border-border px-5 py-5"><h2 id={`stage-date-heading-${row.position}`} className="pr-10 font-display text-2xl font-light">{dialog === "planting" ? "Change planting date" : `Set date for ${row.name}`}</h2></header>
          <div className="px-5 py-5">
            <label htmlFor={`stage-date-${row.position}`} className="mb-2 block text-sm font-medium">{dialog === "planting" ? "Planting date" : "Due date"}</label>
            <input id={`stage-date-${row.position}`} data-autofocus type="date" value={date} min={dialog === "planting" ? "2000-01-01" : "2020-01-01"} max={dialog === "planting" ? today : "2100-12-31"} onChange={(event) => setDate(event.target.value)} className="min-h-11 w-full rounded-[10px] border border-border bg-bg px-3 text-base" />
            {error ? <p role="alert" className="mt-3 text-sm text-overdue">{error}</p> : null}
          </div>
          <footer className="flex gap-3 border-t border-border px-5 py-4"><Button type="button" variant="secondary" onClick={() => setDialog(null)}>Cancel</Button><Button type="submit">Save</Button></footer>
        </form>
      </Modal> : null}
    </>
  );
}
