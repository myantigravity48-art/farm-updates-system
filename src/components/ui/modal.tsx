"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
  onClose,
  labelledBy,
  children,
  presentation = "dialog",
}: {
  onClose: () => void;
  labelledBy: string;
  children: ReactNode;
  presentation?: "dialog" | "drawer";
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previous =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusFirst = () => {
      const target =
        panel?.querySelector<HTMLElement>("[data-autofocus]") ??
        panel?.querySelector<HTMLElement>(FOCUSABLE) ??
        panel;
      target?.focus();
    };

    focusFirst();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
        return;
      }

      if (event.key !== "Tab" || !panel) return;

      const nodes = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (node) => node.offsetParent !== null,
      );

      if (nodes.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const first = nodes[0];
      const last = nodes[nodes.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = originalOverflow;
      previous?.focus();
    };
  }, []);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center ${presentation === "drawer" ? "min-[768px]:items-stretch min-[768px]:justify-end" : "min-[768px]:items-center min-[768px]:p-4"}`}
      style={{ backgroundColor: "color-mix(in srgb, var(--bg) 82%, transparent)" }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeRef.current();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={`relative flex w-full flex-col overflow-hidden border border-border bg-surface text-text ${presentation === "drawer" ? "h-[94dvh] rounded-t-[20px] min-[768px]:h-full min-[768px]:max-h-none min-[768px]:w-[min(560px,92vw)] min-[768px]:rounded-none" : "h-full min-[768px]:h-auto min-[768px]:max-h-[92vh] min-[768px]:max-w-[640px] min-[768px]:rounded-[14px]"}`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-[10px] text-muted hover:bg-raised hover:text-text"
        >
          <X aria-hidden="true" size={20} strokeWidth={1.5} />
        </button>
        {children}
      </div>
    </div>
  );
}
