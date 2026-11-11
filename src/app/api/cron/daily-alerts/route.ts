import { NextResponse } from "next/server";
import { authorizeCron, missingAlertEnvironment } from "@/lib/alerts-job/config";
import { runDailyAlerts } from "@/lib/alerts-job/run";
import { createAlertJobDependencies } from "@/lib/alerts-job/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function handle(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "Job is not configured." }, { status: 500 });
  if (!authorizeCron(request.headers.get("authorization"), secret)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const missing = missingAlertEnvironment(process.env).filter((name) => name !== "CRON_SECRET");
  if (missing.length) return NextResponse.json({ error: "Job is not configured.", missing }, { status: 500 });

  const url = new URL(request.url);
  try {
    const result = await runDailyAlerts(createAlertJobDependencies(), {
      dryRun: url.searchParams.get("dryRun") === "1",
      force: url.searchParams.get("force") === "1",
    });
    const counts = "sentCount" in result ? { sentCount: result.sentCount, failedCount: result.failedCount, rateLimited: result.rateLimited } : result;
    console.info(JSON.stringify({ event: "daily_alerts_complete", ...counts }));
    return NextResponse.json(result);
  } catch (error) {
    const code = error instanceof Error && /^[a-z0-9_]+$/.test(error.message) ? error.message : "daily_alerts_failed";
    console.error(JSON.stringify({ event: "daily_alerts_failed", errorCode: code }));
    return NextResponse.json({ ok: false, errorCode: code }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
