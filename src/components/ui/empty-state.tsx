import type { ReactNode } from "react";

/**
 * One empty-state pattern: a friendly line, an optional second line and at most
 * one action. `card` is for an intentionally empty collection container;
 * `plain` is for a panel that already has its own card.
 */
export function EmptyState({
  title,
  description,
  action,
  variant = "card",
  className = "",
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  variant?: "card" | "plain";
  className?: string;
}) {
  if (variant === "plain") {
    return (
      <div className={`min-w-0 ${className}`.trim()}>
        <p className="text-sm text-muted">{title}</p>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
        {action ? <div className="mt-4">{action}</div> : null}
      </div>
    );
  }

  return (
    <div
      className={`min-w-0 rounded-[14px] border border-dashed border-border bg-surface px-6 py-10 text-center ${className}`.trim()}
    >
      <p className="font-display text-2xl font-light">{title}</p>
      {description ? <p className="mt-2 text-sm text-muted">{description}</p> : null}
      {action ? (
        <div className="mt-6 flex flex-col items-center justify-center gap-2 min-[560px]:flex-row">
          {action}
        </div>
      ) : null}
    </div>
  );
}
