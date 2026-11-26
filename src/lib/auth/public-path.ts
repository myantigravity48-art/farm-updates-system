const AUTH_PATHS = new Set(["/login", "/forgot-password"]);
const PUBLIC_ASSET_PATHS = new Set([
  "/favicon.ico",
  "/manifest.webmanifest",
  "/icon",
  "/apple-icon",
  "/icon-192",
  "/icon-512",
  "/icon-512-maskable",
]);
const STATIC_PATH = /(?:^|\/)(?:_next\/static|_next\/image|favicon\.ico)(?:\/|$)|\.[^/]+$/;

export function isPublicPath(pathname: string): boolean {
  if (pathname === "/api/cron/daily-alerts" || pathname === "/api/cron/daily-alerts/") return true;
  if (pathname.split("/").some((part) => part === "." || part === "..")) return false;
  return (
    AUTH_PATHS.has(pathname) ||
    pathname === "/" ||
    PUBLIC_ASSET_PATHS.has(pathname) ||
    STATIC_PATH.test(pathname)
  );
}
