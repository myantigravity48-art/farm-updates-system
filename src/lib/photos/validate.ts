import { compare, parse, type CalendarDate } from "@/lib/schedule";
import { parseCalendarDate } from "@/lib/farms/validate";

export const PHOTO_BUCKET = "farm-photos";
export const PHOTO_SIGNED_URL_SECONDS = 60 * 60;
export const PHOTO_CAPTION_MAX = 140;
export const PHOTO_MAX_BYTES = 10 * 1024 * 1024;
export const PHOTO_MAX_FILES = 10;

export const PHOTO_ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type PhotoMimeType = (typeof PHOTO_ACCEPTED_TYPES)[number];

export const PHOTO_FORMAT_MESSAGE =
  "This photo format isn't supported. Use JPEG, PNG or WebP.";
export const PHOTO_TOO_LARGE_MESSAGE =
  "This photo is larger than 10 MB. Choose a smaller file.";

const PHOTO_PATH_TAIL = /^[0-9a-f-]{36}\.jpg$/;

export function isAcceptedPhotoType(type: string): type is PhotoMimeType {
  return (PHOTO_ACCEPTED_TYPES as readonly string[]).includes(type);
}

/** Checks the browser-reported type and size before any shrinking happens. */
export function validatePhotoFile(file: { type: string; size: number }): string | null {
  if (!isAcceptedPhotoType(file.type)) return PHOTO_FORMAT_MESSAGE;
  if (!Number.isFinite(file.size) || file.size <= 0) return PHOTO_FORMAT_MESSAGE;
  if (file.size > PHOTO_MAX_BYTES) return PHOTO_TOO_LARGE_MESSAGE;
  return null;
}

export function validatePhotoCaption(value: string): string | undefined {
  if (value.trim().length > PHOTO_CAPTION_MAX) {
    return `Keep the caption to ${PHOTO_CAPTION_MAX} characters or fewer.`;
  }
  return undefined;
}

/**
 * Resolves the taken-on date. An empty value means today in London, and a
 * future date is rejected. The caller supplies today, never the clock.
 */
export function validateTakenOn(
  value: string,
  today: CalendarDate,
): { value: CalendarDate | null; error?: string } {
  const raw = value.trim();
  if (!raw) return { value: today };

  const parsed = parseCalendarDate(raw);
  if (!parsed) return { value: null, error: "Enter a valid date." };
  if (compare(parsed, today) > 0) {
    return { value: null, error: "Choose today or an earlier date." };
  }

  // Prove the date is a real calendar date for the formatter downstream.
  try {
    parse(parsed);
  } catch {
    return { value: null, error: "Enter a valid date." };
  }

  return { value: parsed };
}

/**
 * A stored path must be exactly <farmId>/<uuid>.jpg, generated on the server.
 * This rejects another farm's id, parent segments, other extensions, uppercase
 * hex, and any extra path segment.
 */
export function isValidPhotoPath(path: string, farmId: string): boolean {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(farmId)) {
    return false;
  }

  const prefix = `${farmId}/`;
  if (!path.startsWith(prefix)) return false;

  return PHOTO_PATH_TAIL.test(path.slice(prefix.length));
}

/** The file name inside the farm folder, used to verify the object exists. */
export function photoFileName(path: string): string {
  const index = path.lastIndexOf("/");
  return index === -1 ? path : path.slice(index + 1);
}
