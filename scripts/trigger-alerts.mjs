const args = new Set(process.argv.slice(2));
import { describeResponse } from "../src/lib/alerts-job/describe-response.ts";
const baseUrl = (process.env.ALERTS_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const secret = process.env.CRON_SECRET;

if (!secret) {
  console.error(JSON.stringify({ error: "Missing CRON_SECRET" }));
  process.exit(1);
}

const parsedUrl = new URL(baseUrl);
const localHost = ["localhost", "127.0.0.1", "::1"].includes(parsedUrl.hostname);
if (!localHost && !args.has("--allow-remote")) {
  console.error(JSON.stringify({ error: "Remote target refused; pass --allow-remote to continue." }));
  process.exit(1);
}

const params = new URLSearchParams();
if (args.has("--dry")) params.set("dryRun", "1");
if (args.has("--dry") || args.has("--send")) params.set("force", "1");
const response = await fetch(`${baseUrl}/api/cron/daily-alerts?${params}`, {
  method: "POST",
  redirect: "manual",
  headers: { Authorization: `Bearer ${secret}` },
});
const contentType = response.headers.get("content-type") || "";
const message = describeResponse({ status: response.status, contentType, location: response.headers.get("location") });
if (message) console.log(message);
else if (contentType.includes("application/json")) {
  const body = await response.json();
  if (response.status === 500) console.log(typeof body.message === "string" ? body.message : "The job is not configured.");
  else console.log(JSON.stringify(body));
} else console.log(`The server returned a web page, not JSON (status ${response.status}).`);
if (!response.ok) process.exitCode = 1;
