export function Wordmark() {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-primary text-sm font-medium text-on-primary"
      >
        F
      </span>
      <span className="text-xl font-medium tracking-tight">Farm updates system</span>
    </div>
  );
}
