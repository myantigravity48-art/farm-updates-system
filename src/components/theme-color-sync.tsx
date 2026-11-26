"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

const FALLBACK = { dark: "#0A110D", light: "#F4F3EC" } as const;

/**
 * Keeps the browser chrome colour in step with the in-app theme. The viewport
 * metadata starts on the default dark value; the beforeInteractive script in
 * the root layout corrects it before the first paint, and this effect keeps it
 * correct when the toggle changes.
 */
export function ThemeColorSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (resolvedTheme !== "light" && resolvedTheme !== "dark") return;

    const background =
      getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() ||
      FALLBACK[resolvedTheme];
    const metas = Array.from(
      document.head.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'),
    );
    const meta = metas[0] ?? document.createElement("meta");

    if (!metas[0]) {
      meta.setAttribute("name", "theme-color");
      document.head.prepend(meta);
    }

    meta.removeAttribute("media");
    meta.setAttribute("content", background);
    for (const extra of metas.slice(1)) extra.remove();
  }, [resolvedTheme]);

  return null;
}
