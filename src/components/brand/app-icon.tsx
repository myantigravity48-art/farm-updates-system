/**
 * The app mark: a sprout drawn with basic SVG shapes, moss green on the deep
 * forest background. `inset` keeps the mark inside the central safe zone for
 * maskable icons (0.2 leaves it inside the central 60% of the canvas).
 */
export function AppIconMark({ size, inset }: { size: number; inset: number }) {
  const mark = Math.round(size * (1 - inset * 2));

  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0A110D",
      }}
    >
      <svg width={mark} height={mark} viewBox="0 0 100 100">
        <path
          d="M50 80V45"
          fill="none"
          stroke="#7BC144"
          strokeWidth={7}
          strokeLinecap="round"
        />
        <path d="M50 59C36 59 27 49 29 34C43 34 50 45 50 59Z" fill="#7BC144" />
        <path d="M50 51C64 51 73 41 71 26C57 26 50 37 50 51Z" fill="#7BC144" />
      </svg>
    </div>
  );
}
