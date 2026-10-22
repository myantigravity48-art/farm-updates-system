const londonHourFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  hour: "2-digit",
  hourCycle: "h23",
});

/** Returns the civil hour in Europe/London for an explicit instant, never the device zone. */
export function londonHour(now: Date): number {
  const part = londonHourFormat
    .formatToParts(now)
    .find((item) => item.type === "hour")?.value;

  return Number(part ?? 0);
}

export type Greeting = "Good morning" | "Good afternoon" | "Good evening";

/** Maps a London civil hour to a greeting, with no date or time-zone logic. */
export function greetingForHour(hour: number): Greeting {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/**
 * Builds the dashboard greeting from an explicit instant and the optional display name.
 * The name is appended only when the user's metadata has one.
 */
export function getGreeting(now: Date, displayName?: string | null): string {
  const greeting = greetingForHour(londonHour(now));
  const name = displayName?.trim();
  return name ? `${greeting}, ${name}` : greeting;
}
