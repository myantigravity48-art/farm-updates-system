import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-bg text-text">
      <div className="absolute right-4 top-4 z-10 rounded-xl border border-border bg-surface">
        <ThemeToggle />
      </div>
      {children}
    </div>
  );
}
