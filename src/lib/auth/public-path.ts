const AUTH_PATHS = new Set(["/login", "/forgot-password"]);
const STATIC_PATH = /(?:^|\/)(?:_next\/static|_next\/image|favicon\.ico)(?:\/|$)|\.[^/]+$/;

export function isPublicPath(pathname: string): boolean {
  if (pathname === "/api/cron/daily-alerts" || pathname === "/api/cron/daily-alerts/") return true;
  if (pathname.split("/").some((part) => part === "." || part === "..")) return false;
  return AUTH_PATHS.has(pathname) || pathname === "/" || STATIC_PATH.test(pathname);
}
