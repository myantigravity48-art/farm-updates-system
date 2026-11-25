import { AlertCircle, CalendarOff, Check, CircleCheck, Clock3, type LucideIcon } from "lucide-react";
import type { FarmStatus } from "@/lib/data/types";
import { Icon } from "@/components/ui/icon";

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
  const StatusIcon = statusIcons[status];
  return (
    <span className={`status-pill status-pill--${status}`}>
      <Icon icon={StatusIcon} size="inline" />
      {label ?? statusLabels[status]}
    </span>
  );
}
