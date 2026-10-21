"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";

export function Toast({
  message,
  onDismiss,
  action,
}: {
  message: string;
  onDismiss: () => void;
  action?: { label: string; onClick: () => void };
}) {
  const dismissRef = useRef(onDismiss);

  useEffect(() => {
    dismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    const timer = window.setTimeout(() => dismissRef.current(), 5000);
    return () => window.clearTimeout(timer);
  }, [message]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 bottom-24 z-[60] flex items-center gap-3 rounded-[10px] border border-border bg-raised px-4 py-3 text-sm text-text min-[768px]:bottom-6 min-[768px]:left-auto min-[768px]:right-6 min-[768px]:w-[360px]"
    >
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
