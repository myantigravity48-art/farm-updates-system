const args = new Set(process.argv.slice(2));
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
  headers: { Authorization: `Bearer ${secret}` },
});
const body = await response.json();
console.log(JSON.stringify(body));
if (!response.ok) process.exitCode = 1;
