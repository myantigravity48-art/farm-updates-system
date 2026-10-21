import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Slot for the moss photograph used on the login screen.
 * Drop the file at public/login-moss.jpg; it is used automatically.
 */
export const LOGIN_PHOTO_PATH = "public/login-moss.jpg";

export function loginPhotoExists(): boolean {
  return existsSync(path.join(process.cwd(), LOGIN_PHOTO_PATH));
}
