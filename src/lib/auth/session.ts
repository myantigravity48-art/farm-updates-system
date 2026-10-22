import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MissingSupabaseConfigError } from "@/lib/supabase/config";

export type SessionUser = {
  id: string;
  email: string;
  /** From user_metadata.display_name, null when unset. */
  displayName: string | null;
};

export type SessionState =
  | { status: "authenticated"; user: SessionUser }
  | { status: "signed-out" }
  | { status: "missing-config"; variable: string };

/**
 * Validates the current user on the server with auth.getUser().
 * Never trusts the cookie or getSession() alone.
 */
export const readSession = cache(async (): Promise<SessionState> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user?.email) {
      return { status: "signed-out" };
    }

    return {
      status: "authenticated",
      user: {
        id: data.user.id,
        email: data.user.email,
        displayName: readDisplayName(data.user.user_metadata),
      },
    };
  } catch (error) {
    if (error instanceof MissingSupabaseConfigError) {
      return { status: "missing-config", variable: error.variable };
    }
    return { status: "signed-out" };
  }
});

/** Reads display_name from user metadata without trusting its shape. */
function readDisplayName(metadata: unknown): string | null {
  if (typeof metadata !== "object" || metadata === null) return null;
  const value = (metadata as Record<string, unknown>).display_name;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function requireSessionUser(): Promise<SessionUser> {
  const session = await readSession();

  if (session.status === "signed-out") {
    redirect("/login");
  }

  if (session.status === "missing-config") {
    throw new MissingSupabaseConfigError(session.variable);
  }

  return session.user;
}
