const SERVICE_ROLE_ENV_NAME = ["SUPABASE", "SERVICE", "ROLE", "KEY"].join("_");

export const REQUIRED_ALERT_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  SERVICE_ROLE_ENV_NAME,
  "RESEND_API_KEY",
  "ALERT_FROM_ADDRESS",
  "APP_URL",
  "CRON_SECRET",
] as const;

export function missingAlertEnvironment(env: Record<string, string | undefined>): string[] {
  return REQUIRED_ALERT_ENV.filter((name) => !env[name]?.trim());
}

export function authorizeCron(header: string | null, secret: string): boolean {
  const expected = `Bearer ${secret}`;
  if (!secret || header === null) return false;
  const encoder = new TextEncoder();
  const left = encoder.encode(header);
  const right = encoder.encode(expected);
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return difference === 0;
}
