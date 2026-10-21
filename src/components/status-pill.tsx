import { AlertCircle, Check, CircleCheck, Clock3 } from "lucide-react";
import type { FarmStatus } from "@/lib/data/types";

export type StatusVariant = FarmStatus | "done";

const statusContent = {
  "on-track": { label: "On track", Icon: CircleCheck },
  "due-soon": { label: "Due soon", Icon: Clock3 },
  overdue: { label: "Overdue", Icon: AlertCircle },
  done: { label: "Done", Icon: Check },
} satisfies Record<StatusVariant, { label: string; Icon: typeof Check }>;

export function StatusPill({ status }: { status: StatusVariant }) {
  const { label, Icon } = statusContent[status];
  return (
    <span className={`status-pill status-pill--${status}`}>
      <Icon aria-hidden="true" size={15} strokeWidth={1.7} />
      {label}
    </span>
  );
}
