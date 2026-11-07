"use client";

import { AlertCircle, Check, X } from "lucide-react";
import { useEffect, useRef } from "react";

export function Toast({
  message,
  onDismiss,
  action,
  durationMs = 5000,
  status = "success",
}: {
  message: string;
  onDismiss: () => void;
  action?: { label: string; onClick: () => void };
  durationMs?: number;
  status?: "success" | "error";
}) {
  const dismissRef = useRef(onDismiss);
  const StatusIcon = status === "success" ? Check : AlertCircle;

  useEffect(() => {
    dismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    const timer = window.setTimeout(() => dismissRef.current(), durationMs);
    return () => window.clearTimeout(timer);
  }, [message, durationMs]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 bottom-24 z-[60] flex items-center gap-3 rounded-[10px] border border-border bg-raised px-4 py-3 text-sm text-text min-[768px]:bottom-6 min-[768px]:left-auto min-[768px]:right-6 min-[768px]:w-[360px]"
    >
      <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-full ${status === "success" ? "bg-primary/15 text-primary" : "bg-overdue/15 text-overdue"}`}>
        <StatusIcon aria-hidden="true" size={17} strokeWidth={1.7} />
      </span>
      <p className="min-w-0 flex-1">{message}</p>
      {action ? (
        <button
          type="button"
          onClick={action.onClick}
          className="min-h-11 rounded-[10px] px-2 font-medium text-primary hover:bg-surface"
        >
          {action.label}
        </button>
      ) : null}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="flex h-11 w-11 flex-none items-center justify-center rounded-[10px] text-muted hover:bg-surface hover:text-text"
      >
        <X aria-hidden="true" size={18} strokeWidth={1.5} />
      </button>
    </div>
  );
}
