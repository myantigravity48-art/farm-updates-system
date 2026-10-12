import type { FarmStatus } from "@/mocks/farms";

export function StatusDot({ status }: { status: FarmStatus }) {
  return <span aria-hidden="true" className={`status-dot status-dot--${status}`} />;
}
