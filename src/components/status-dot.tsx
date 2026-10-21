import type { FarmStatus } from "@/lib/data/types";

export function StatusDot({ status }: { status: FarmStatus }) {
  return <span aria-hidden="true" className={`status-dot status-dot--${status}`} />;
}
