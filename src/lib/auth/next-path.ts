const FALLBACK_PATH = "/";

/**
 * Sanitises the `next` query parameter used after sign in.
 * Accepts only a relative path that starts with a single "/" and contains no
 * scheme or backslash. Everything else falls back to "/".
 */
export function safeNextPath(value: unknown): string {
  if (typeof value !== "string") return FALLBACK_PATH;
  if (value.length === 0) return FALLBACK_PATH;
  if (!value.startsWith("/")) return FALLBACK_PATH;
  if (value.startsWith("//")) return FALLBACK_PATH;
  if (value.includes("\\")) return FALLBACK_PATH;
  if (/[\u0000-\u001F\u007F]/.test(value)) return FALLBACK_PATH;
  return value;
}
