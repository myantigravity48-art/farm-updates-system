import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { emailTheme } from "@/lib/email/email-theme";

/**
 * WCAG 2.1 relative luminance and contrast ratio.
 * These are the real formulas, so a token change cannot pass by eye.
 */
type Rgb = [number, number, number];

function parseHex(hex: string): Rgb {
  const value = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(value)) throw new Error(`Not a six-digit hex colour: ${hex}`);
  return [0, 2, 4].map((start) => parseInt(value.slice(start, start + 2), 16)) as Rgb;
}

function toHex({ 0: red, 1: green, 2: blue }: Rgb): string {
  return `#${[red, green, blue].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

function linearise(channel: number): number {
  const srgb = channel / 255;
  return srgb <= 0.04045 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
  const [red, green, blue] = parseHex(hex).map(linearise);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(foreground: string, background: string): number {
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);
  const [lighter, darker] = first > second ? [first, second] : [second, first];
  return (lighter + 0.05) / (darker + 0.05);
}

/** CSS color-mix(in srgb, colour 18%, transparent) composited over an opaque layer. */
function tintOver(colour: string, background: string, alpha = 0.18): string {
  const foreground = parseHex(colour);
  const behind = parseHex(background);
  return toHex(foreground.map((channel, index) => Math.round(channel * alpha + behind[index] * (1 - alpha))) as Rgb);
}

function round(ratio: number): number {
  return Math.round(ratio * 100) / 100;
}

const css = readFileSync(fileURLToPath(new URL("../../app/globals.css", import.meta.url)), "utf8");
const design = readFileSync(fileURLToPath(new URL("../../../docs/DESIGN.md", import.meta.url)), "utf8");

function themeTokens(selector: RegExp): Record<string, string> {
  const block = css.match(selector)?.[1];
  if (!block) throw new Error("Theme block not found in src/app/globals.css");
  return Object.fromEntries(
    [...block.matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{6});/g)].map((match) => [match[1], match[2].toUpperCase()]),
  );
}

const dark = themeTokens(/:root,\s*\.dark\s*\{([\s\S]*?)\}/);
const light = themeTokens(/\.light\s*\{([\s\S]*?)\}/);

const alertsScreen = readFileSync(
  fileURLToPath(new URL("../../components/alerts/alerts-screen.tsx", import.meta.url)),
  "utf8",
);

const textTokens = ["text", "muted", "primary", "due-soon", "overdue"] as const;
const layers = ["bg", "surface", "raised"] as const;

describe("WCAG contrast helpers", () => {
  it("uses the real relative-luminance endpoints", () => {
    expect(relativeLuminance("#FFFFFF")).toBeCloseTo(1, 6);
    expect(relativeLuminance("#000000")).toBeCloseTo(0, 6);
    expect(round(contrastRatio("#000000", "#FFFFFF"))).toBe(21);
    expect(round(contrastRatio("#FFFFFF", "#FFFFFF"))).toBe(1);
  });

  it("composites an 18% tint the way color-mix in srgb does", () => {
    expect(tintOver("#000000", "#FFFFFF")).toBe("#D1D1D1");
    expect(tintOver("#FFFFFF", "#000000")).toBe("#2E2E2E");
  });
});

describe("light due-soon token", () => {
  const dueSoon = light["due-soon"];

  it("is the approved darker value in the CSS, the design doc and the email theme", () => {
    expect(dueSoon).toBe("#7A4E00");
    expect(design).toContain("--due-soon: #7A4E00;");
    expect(emailTheme.dueSoon.toUpperCase()).toBe(dueSoon);
  });

  it("reaches 4.5:1 as text on the background, the surface and the raised layer", () => {
    for (const layer of layers) {
      expect(round(contrastRatio(dueSoon, light[layer]))).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("reaches 4.5:1 as text on its own 18% pill tint over every light layer", () => {
    for (const layer of layers) {
      expect(round(contrastRatio(dueSoon, tintOver(dueSoon, light[layer])))).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("keeps the measured ratios in the report range", () => {
    expect(round(contrastRatio(dueSoon, light.bg))).toBe(6.47);
    expect(round(contrastRatio(dueSoon, light.surface))).toBe(7.2);
    expect(round(contrastRatio(dueSoon, tintOver(dueSoon, light.bg)))).toBe(4.94);
    expect(round(contrastRatio(dueSoon, tintOver(dueSoon, light.surface)))).toBe(5.44);
  });
});

describe("dark due-soon token", () => {
  const dueSoon = dark["due-soon"];

  it("keeps 4.5:1 on every dark layer and on its own 18% tint", () => {
    for (const layer of layers) {
      expect(round(contrastRatio(dueSoon, dark[layer]))).toBeGreaterThanOrEqual(4.5);
      expect(round(contrastRatio(dueSoon, tintOver(dueSoon, dark[layer])))).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("text and status tokens", () => {
  it.each([
    ["dark", dark],
    ["light", light],
  ] as const)("keep 4.5:1 on background, surface and raised in %s mode", (_theme, tokens) => {
    for (const token of textTokens) {
      for (const layer of layers) {
        expect(round(contrastRatio(tokens[token], tokens[layer]))).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});

describe("switch off state", () => {
  it("uses the shared off-track and thumb tokens", () => {
    expect(alertsScreen).toContain('checked ? "bg-primary" : "bg-muted"');
    expect(alertsScreen).toContain(
      'checked ? "translate-x-[23px] bg-surface" : "translate-x-[3px] bg-text"',
    );
  });

  it.each([
    ["dark", dark],
    ["light", light],
  ] as const)(
    "reaches 3:1 for the off track and thumb against the card surface in %s mode",
    (_theme, tokens) => {
      expect(round(contrastRatio(tokens.muted, tokens.surface))).toBeGreaterThanOrEqual(3);
      expect(round(contrastRatio(tokens.text, tokens.surface))).toBeGreaterThanOrEqual(3);
    },
  );
});
