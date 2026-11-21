import type { ComponentPropsWithoutRef, ReactNode } from "react";

/**
 * Shared layout convention for page-level content.
 *
 * Peer sections sit 24px apart on phones and 32px apart from 768px up.
 * 16px stays inside a card, and 8–12px for tightly related controls.
 * Both values come from the spacing scale in docs/DIRECTION.md.
 */
export function SectionStack({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-w-0 space-y-6 min-[768px]:space-y-8 ${className}`.trim()}>
      {children}
    </div>
  );
}

/** A surface card. Use it only where it groups meaningful content. */
export function Section({
  className = "",
  children,
  ...props
}: ComponentPropsWithoutRef<"section">) {
  return (
    <section
      className={`min-w-0 rounded-[14px] border border-border bg-surface p-4 min-[768px]:p-5 ${className}`.trim()}
      {...props}
    >
      {children}
    </section>
  );
}
