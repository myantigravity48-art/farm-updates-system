import { describe, expect, it } from "vitest";
import type { CalendarDate } from "@/lib/schedule";
import {
  PHOTO_CAPTION_MAX,
  PHOTO_FORMAT_MESSAGE,
  PHOTO_MAX_BYTES,
  PHOTO_TOO_LARGE_MESSAGE,
  isValidPhotoPath,
  photoFileName,
  validatePhotoCaption,
  validatePhotoFile,
  validateTakenOn,
} from "./validate";

const farmId = "11111111-1111-4111-8111-111111111111";
const otherFarmId = "99999999-9999-4999-8999-999999999999";
const photoId = "2a2a2a2a-2a2a-4a2a-8a2a-2a2a2a2a2a2a";
const today = "2026-10-26" as CalendarDate;

describe("validatePhotoCaption", () => {
  it("accepts a caption on the limit", () => {
    expect(validatePhotoCaption("a".repeat(PHOTO_CAPTION_MAX))).toBeUndefined();
  });

  it("rejects a caption over the limit", () => {
    expect(validatePhotoCaption("a".repeat(PHOTO_CAPTION_MAX + 1))).toBe(
      `Keep the caption to ${PHOTO_CAPTION_MAX} characters or fewer.`,
    );
  });
});

describe("validateTakenOn", () => {
  it("defaults to today when empty", () => {
    expect(validateTakenOn("", today)).toEqual({ value: today });
    expect(validateTakenOn("   ", today)).toEqual({ value: today });
  });

  it("accepts today and a past date", () => {
    expect(validateTakenOn("2026-10-26", today)).toEqual({ value: "2026-10-26" });
    expect(validateTakenOn("2025-12-01", today)).toEqual({ value: "2025-12-01" });
  });

  it("rejects a future date", () => {
    expect(validateTakenOn("2026-10-27", today)).toEqual({
      value: null,
      error: "Choose today or an earlier date.",
    });
  });

  it("rejects an impossible date", () => {
    expect(validateTakenOn("2026-02-30", today)).toEqual({
      value: null,
      error: "Enter a valid date.",
    });
  });
});

describe("validatePhotoFile", () => {
  it("accepts JPEG, PNG and WebP under the size limit", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"]) {
      expect(validatePhotoFile({ type, size: 1024 })).toBeNull();
    }
  });

  it("accepts a file exactly at the 10 MB limit", () => {
    expect(validatePhotoFile({ type: "image/jpeg", size: PHOTO_MAX_BYTES })).toBeNull();
  });

  it("rejects a file over 10 MB before shrinking", () => {
    expect(validatePhotoFile({ type: "image/jpeg", size: PHOTO_MAX_BYTES + 1 })).toBe(
      PHOTO_TOO_LARGE_MESSAGE,
    );
  });

  it("rejects other formats", () => {
    expect(validatePhotoFile({ type: "image/gif", size: 1024 })).toBe(PHOTO_FORMAT_MESSAGE);
    expect(validatePhotoFile({ type: "application/pdf", size: 1024 })).toBe(PHOTO_FORMAT_MESSAGE);
    expect(validatePhotoFile({ type: "", size: 1024 })).toBe(PHOTO_FORMAT_MESSAGE);
  });

  it("rejects an empty file", () => {
    expect(validatePhotoFile({ type: "image/jpeg", size: 0 })).toBe(PHOTO_FORMAT_MESSAGE);
  });
});

describe("isValidPhotoPath", () => {
  it("accepts a path generated for this farm", () => {
    expect(isValidPhotoPath(`${farmId}/${photoId}.jpg`, farmId)).toBe(true);
  });

  it("rejects another farm's id", () => {
    expect(isValidPhotoPath(`${otherFarmId}/${photoId}.jpg`, farmId)).toBe(false);
  });

  it("rejects parent segments", () => {
    expect(isValidPhotoPath(`${farmId}/../${photoId}.jpg`, farmId)).toBe(false);
    expect(isValidPhotoPath(`${farmId}/../../secret/${photoId}.jpg`, farmId)).toBe(false);
  });

  it("rejects a wrong extension", () => {
    expect(isValidPhotoPath(`${farmId}/${photoId}.png`, farmId)).toBe(false);
    expect(isValidPhotoPath(`${farmId}/${photoId}.jpg.exe`, farmId)).toBe(false);
  });

  it("rejects uppercase hex", () => {
    expect(isValidPhotoPath(`${farmId}/${photoId.toUpperCase()}.jpg`, farmId)).toBe(false);
  });

  it("rejects extra path segments", () => {
    expect(isValidPhotoPath(`${farmId}/folder/${photoId}.jpg`, farmId)).toBe(false);
    expect(isValidPhotoPath(`${farmId}/${photoId}.jpg/extra`, farmId)).toBe(false);
  });

  it("rejects a bare file name and an invalid farm id", () => {
    expect(isValidPhotoPath(`${photoId}.jpg`, farmId)).toBe(false);
    expect(isValidPhotoPath(`${farmId}/${photoId}.jpg`, "not-a-uuid")).toBe(false);
  });
});

describe("photoFileName", () => {
  it("returns the name inside the farm folder", () => {
    expect(photoFileName(`${farmId}/${photoId}.jpg`)).toBe(`${photoId}.jpg`);
  });
});
