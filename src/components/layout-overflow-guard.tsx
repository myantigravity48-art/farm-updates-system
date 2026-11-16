"use client";

import { useEffect } from "react";

export function LayoutOverflowGuard() {
  useEffect(() => {
    let frame = 0;

    const inspect = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const root = document.documentElement;
        if (root.scrollWidth <= root.clientWidth) return;

        const elements = Array.from(document.body.querySelectorAll<HTMLElement>("*"))
          .map((element) => ({
            element,
            right: element.getBoundingClientRect().right,
          }))
          .filter(({ right }) => right > root.clientWidth + 1)
          .sort((a, b) => b.right - a.right)
          .slice(0, 3)
          .map(({ element, right }) => ({
            tag: element.tagName.toLowerCase(),
            className: typeof element.className === "string" ? element.className.slice(0, 100) : "",
            right: Math.round(right),
          }));

        console.warn("Horizontal page overflow detected", {
          scrollWidth: root.scrollWidth,
          clientWidth: root.clientWidth,
          elements,
        });
      });
    };

    window.addEventListener("load", inspect);
    window.addEventListener("resize", inspect);
    inspect();

    return () => {
      window.removeEventListener("load", inspect);
      window.removeEventListener("resize", inspect);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
