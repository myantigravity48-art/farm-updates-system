export function describeResponse({ status, contentType = "" }: { status: number; contentType?: string; location?: string | null }): string | null {
  if (status >= 300 && status < 400) return "The server redirected to a login page, so the job route is being blocked.";
  if (status === 401) return "The job rejected the secret. Check that CRON_SECRET in .env.local matches, then restart npm run dev, because env files are read only at startup.";
  if (status === 500 && contentType.includes("application/json")) return null;
  if (!contentType.includes("application/json")) return `The server returned a web page, not JSON (status ${status}).`;
  return null;
}
