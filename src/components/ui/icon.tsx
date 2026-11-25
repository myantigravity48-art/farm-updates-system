import type { LucideIcon, LucideProps } from "lucide-react";

/**
 * One icon treatment for the whole app: Lucide only, 1.5px stroke.
 *
 * `control` (20px) is the default for buttons, navigation and icon-only
 * controls. `inline` (16px) is for an icon set beside text. `large` (24px) is
 * reserved for a prominent primary action; no control uses it yet.
 */
export type IconSize = "inline" | "control" | "large";

const sizes: Record<IconSize, number> = {
  inline: 16,
  control: 20,
  large: 24,
};

export function Icon({
  icon: Glyph,
  size = "control",
  className,
  ...props
}: {
  icon: LucideIcon;
  size?: IconSize;
} & Omit<LucideProps, "size" | "strokeWidth">) {
  return (
    <Glyph
      aria-hidden="true"
      size={sizes[size]}
      strokeWidth={1.5}
      className={className}
      {...props}
    />
  );
}
