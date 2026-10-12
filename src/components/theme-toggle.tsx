"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
  const isDark = !mounted || resolvedTheme !== "light";
  const label = isDark ? "Switch to light theme" : "Switch to dark theme";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={label}
      title={label}
      className="flex h-11 w-11 items-center justify-center rounded-xl text-muted hover:bg-raised hover:text-text"
    >
      {isDark ? <Sun aria-hidden="true" size={20} strokeWidth={1.5} /> : <Moon aria-hidden="true" size={20} strokeWidth={1.5} />}
    </button>
  );
}
