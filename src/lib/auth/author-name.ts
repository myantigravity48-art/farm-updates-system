const FALLBACK_AUTHOR = "A user";

function readMetadataName(metadata: unknown): string | null {
  if (typeof metadata !== "object" || metadata === null) return null;
  const value = (metadata as Record<string, unknown>).display_name;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** The email local part, for example "owner" from "owner@example.com". */
export function emailLocalPart(email: string | null | undefined): string | null {
  if (!email) return null;
  const local = email.split("@")[0]?.trim();
  return local || null;
}

/**
 * The author name stored with a note or photo: the display_name from the
 * user's metadata, falling back to the email local part. Never logs the email.
 */
export function authorNameFromUser(user: {
  email?: string | null;
  user_metadata?: unknown;
}): string {
  return (
    readMetadataName(user.user_metadata) ??
    emailLocalPart(user.email) ??
    FALLBACK_AUTHOR
  );
}
