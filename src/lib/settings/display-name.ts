export const DISPLAY_NAME_MAX = 40;

export interface DisplayNameValidation {
  ok: boolean;
  error?: string;
  value: string | null;
}

/** A display name is 1 to 40 characters after trimming. */
export function validateDisplayName(value: string): DisplayNameValidation {
  const name = value.trim();

  if (!name) return { ok: false, error: "Enter a display name.", value: null };
  if (name.length > DISPLAY_NAME_MAX) {
    return {
      ok: false,
      error: `Keep the display name to ${DISPLAY_NAME_MAX} characters or fewer.`,
      value: null,
    };
  }

  return { ok: true, value: name };
}
