export const MIN_PASSWORD_LENGTH = 12;

export type PasswordValidation =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Validates a new password and its confirmation.
 * Pure function shared by the client form and the server action.
 */
export function validateNewPassword(password: string, confirmation: string): PasswordValidation {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, message: `Use at least ${MIN_PASSWORD_LENGTH} characters.` };
  }

  if (password !== confirmation) {
    return { ok: false, message: "The passwords do not match." };
  }

  return { ok: true };
}
