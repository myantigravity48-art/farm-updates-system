export const SUPABASE_URL_VARIABLE = "NEXT_PUBLIC_SUPABASE_URL";
export const SUPABASE_KEY_VARIABLE = "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY";

/**
 * Thrown when a public Supabase environment variable is missing.
 * The message names the variable so the failure is readable in the UI instead
 * of rendering a blank page.
 */
export class MissingSupabaseConfigError extends Error {
  readonly variable: string;

  constructor(variable: string) {
    super(`Missing environment variable: ${variable}. Add it to .env.local and restart the app.`);
    this.name = "MissingSupabaseConfigError";
    this.variable = variable;
  }
}

/**
 * Reads the public Supabase configuration lazily so a missing value can be
 * reported at request time rather than at module load.
 */
export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new MissingSupabaseConfigError(SUPABASE_URL_VARIABLE);

  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!publishableKey) throw new MissingSupabaseConfigError(SUPABASE_KEY_VARIABLE);

  return { url, publishableKey };
}
