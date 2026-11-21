/**
 * A static placeholder that mirrors the geometry of the content it replaces.
 * Motion is deliberately absent: animation belongs to the motion batch.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`block rounded-[10px] bg-raised ${className}`.trim()} />;
}
