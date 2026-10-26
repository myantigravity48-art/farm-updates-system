export const NOTE_BODY_MAX = 2000;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface NoteInput {
  body: string;
  /** The linked farm stage id, or an empty string for no link. */
  stageId: string;
}

export interface NoteFieldErrors {
  body?: string;
  stageId?: string;
}

export interface NoteValues {
  body: string;
  stageId: string | null;
}

export interface NoteValidation {
  ok: boolean;
  errors: NoteFieldErrors;
  values: NoteValues | null;
}

export function validateNoteBody(value: string): string | undefined {
  const body = value.trim();
  if (!body) return "Add a note.";
  if (body.length > NOTE_BODY_MAX) {
    return `Keep the note to ${NOTE_BODY_MAX} characters or fewer.`;
  }
  return undefined;
}

/**
 * Validates a note on the server. The stage link is optional, but when one is
 * given it must belong to the same farm the note is being added to.
 */
export function validateNote(
  input: NoteInput,
  context: { stageIds: string[] },
): NoteValidation {
  const errors: NoteFieldErrors = {};
  const bodyError = validateNoteBody(input.body);
  if (bodyError) errors.body = bodyError;

  const rawStageId = input.stageId.trim();
  let stageId: string | null = null;

  if (rawStageId) {
    if (!UUID.test(rawStageId) || !context.stageIds.includes(rawStageId)) {
      errors.stageId = "Choose a stage from this farm.";
    } else {
      stageId = rawStageId;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors, values: null };
  }

  return {
    ok: true,
    errors,
    values: { body: input.body.trim(), stageId },
  };
}
