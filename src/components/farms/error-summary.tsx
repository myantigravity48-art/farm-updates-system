import type { FarmFieldErrors } from "@/lib/farms/validate";

const fieldLabels: Record<keyof FarmFieldErrors, string> = {
  name: "Farm name",
  location: "Location",
  size: "Size",
  notes: "Notes",
  currentPosition: "Where is it in the process?",
  plantingDate: "Planting date",
};

export function ErrorSummary({
  message,
  errors,
}: {
  message?: string;
  errors?: FarmFieldErrors;
}) {
  const entries = Object.entries(errors ?? {}) as Array<[keyof FarmFieldErrors, string]>;
  if (!message && entries.length === 0) return null;

  return (
    <div role="alert" className="mb-5 rounded-[10px] border border-overdue p-4 text-sm">
      {message ? <p className="font-medium">{message}</p> : null}
      {entries.length > 0 ? (
        <ul className="mt-2 space-y-1 text-muted">
          {entries.map(([field, error]) => (
            <li key={field}>
              <span className="font-medium text-text">{fieldLabels[field]}:</span> {error}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
