import { AlertCircle, CalendarOff, Check, CircleCheck, Clock3, type LucideIcon } from "lucide-react";
import type { FarmStatus } from "@/lib/data/types";

export type StatusVariant = FarmStatus | "done" | "unscheduled";

export const statusIcons: Record<StatusVariant, LucideIcon> = {
  "on-track": CircleCheck,
  "due-soon": Clock3,
  overdue: AlertCircle,
  done: Check,
  unscheduled: CalendarOff,
};

const statusLabels: Record<StatusVariant, string> = {
  "on-track": "On track",
  "due-soon": "Due soon",
  overdue: "Overdue",
  done: "Done",
  unscheduled: "Unscheduled",
};

export function StatusPill({ status, label }: { status: StatusVariant; label?: string }) {
  const Icon = statusIcons[status];
  return (
    <span className={`status-pill status-pill--${status}`}>
      <Icon aria-hidden="true" size={15} strokeWidth={1.7} />
      {label ?? statusLabels[status]}
    </span>
  );
}
