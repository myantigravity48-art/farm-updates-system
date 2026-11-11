export interface RecipientInput {
  name: string;
  email: string;
  phone?: string;
}

export interface RecipientValues {
  name: string;
  email: string;
  phone: string | null;
}

export interface TimingValues {
  headsUpDays: number;
  reminderDays: number;
  overdueEnabled: boolean;
  overdueRepeatDays: number;
  windowNudgeDays: number;
}

export type Validation<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRecipient(input: RecipientInput, existingCount: number): Validation<RecipientValues> {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const rawPhone = input.phone ?? "";
  const phone = rawPhone.trim();
  const errors: Record<string, string> = {};

  if (!name) errors.name = "Enter a name.";
  else if (name.length > 60) errors.name = "Keep the name to 60 characters or fewer.";
  if (!email) errors.email = "Enter an email address.";
  else if (email.length > 254 || !EMAIL_PATTERN.test(email)) errors.email = "Enter a valid email address (up to 254 characters).";
  if (rawPhone.length > 30 || (rawPhone !== "" && !/^[0-9 +()\-]+$/.test(rawPhone)) || (phone !== "" && (phone.replace(/[ +()\-]/g, "").length < 7 || phone.replace(/[ +()\-]/g, "").length > 20))) {
    errors.phone = "Enter a phone number with 7 to 20 digits, or leave it empty.";
  }
  if (existingCount >= 10) errors.form = "The alert list already has 10 recipients. Remove one before adding another.";

  return Object.keys(errors).length
    ? { ok: false, errors }
    : { ok: true, value: { name, email, phone: phone || null } };
}

export function validateRecipientUpdate(
  input: RecipientInput,
  id: string,
  recipients: Array<{ id: string; email: string }>,
): Validation<RecipientValues> {
  const validation = validateRecipient(input, 0);
  if (!validation.ok) return validation;
  if (recipients.some((recipient) => recipient.id !== id && recipient.email.trim().toLowerCase() === validation.value.email)) {
    return { ok: false, errors: { form: "That email address is already on the list." } };
  }
  return validation;
}

export function validateTiming(input: TimingValues): Validation<TimingValues> {
  const errors: Record<string, string> = {};
  if (!Number.isInteger(input.headsUpDays) || input.headsUpDays < 1 || input.headsUpDays > 60) {
    errors.headsUpDays = "Enter a whole number from 1 to 60 days.";
  }
  if (!Number.isInteger(input.reminderDays) || input.reminderDays < 0 || input.reminderDays > 30) {
    errors.reminderDays = "Enter a whole number from 0 to 30 days.";
  } else if (Number.isInteger(input.headsUpDays) && input.reminderDays >= input.headsUpDays) {
    errors.reminderDays = "Set the reminder to fewer days than the heads-up.";
  }
  if (typeof input.overdueEnabled !== "boolean") {
    errors.overdueEnabled = "Choose whether to send overdue emails.";
  }
  if (!Number.isInteger(input.overdueRepeatDays) || input.overdueRepeatDays < 1 || input.overdueRepeatDays > 30) {
    errors.overdueRepeatDays = "Enter a whole number from 1 to 30 days.";
  }
  if (!Number.isInteger(input.windowNudgeDays) || input.windowNudgeDays < 0 || input.windowNudgeDays > 60) {
    errors.windowNudgeDays = "While a season window is open, remind every n days must be a whole number from 0 to 60.";
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: input };
}

export function isDuplicateEmailError(message: string): boolean {
  return /duplicate key|unique constraint|recipients_email/i.test(message);
}
