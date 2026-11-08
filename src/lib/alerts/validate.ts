export interface RecipientInput {
  name: string;
  email: string;
}

export interface RecipientValues {
  name: string;
  email: string;
}

export interface TimingValues {
  headsUpDays: number;
  reminderDays: number;
  overdueEnabled: boolean;
  overdueRepeatDays: number;
}

export type Validation<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRecipient(input: RecipientInput, existingCount: number): Validation<RecipientValues> {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const errors: Record<string, string> = {};

  if (!name) errors.name = "Enter a name.";
  else if (name.length > 60) errors.name = "Keep the name to 60 characters or fewer.";
  if (!email) errors.email = "Enter an email address.";
  else if (email.length > 254 || !EMAIL_PATTERN.test(email)) errors.email = "Enter a valid email address (up to 254 characters).";
  if (existingCount >= 10) errors.form = "The alert list already has 10 recipients. Remove one before adding another.";

  return Object.keys(errors).length
    ? { ok: false, errors }
    : { ok: true, value: { name, email } };
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
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: input };
}

export function isDuplicateEmailError(message: string): boolean {
  return /duplicate key|unique constraint|recipients_email/i.test(message);
}
