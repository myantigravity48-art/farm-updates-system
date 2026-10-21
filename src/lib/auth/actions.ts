"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MissingSupabaseConfigError } from "@/lib/supabase/config";
import { safeNextPath } from "./next-path";
import { validateNewPassword } from "./password";
import {
  GENERIC_SIGN_IN_ERROR,
  NETWORK_ERROR,
  PASSWORD_CHANGE_FAILED,
  PASSWORD_CHANGED,
  SESSION_ENDED,
} from "./messages";
import type { ChangePasswordState, SignInState } from "./types";

function readField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function signIn(_previous: SignInState, formData: FormData): Promise<SignInState> {
  const email = readField(formData, "email").trim();
  const password = readField(formData, "password");
  const nextPath = safeNextPath(readField(formData, "next"));

  if (!email || !password) {
    return { error: GENERIC_SIGN_IN_ERROR };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return { error: GENERIC_SIGN_IN_ERROR };
    }
  } catch (error) {
    if (error instanceof MissingSupabaseConfigError) {
      return { error: error.message };
    }
    return { error: NETWORK_ERROR };
  }

  redirect(nextPath);
}

export async function changePassword(
  _previous: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const password = readField(formData, "newPassword");
  const confirmation = readField(formData, "confirmPassword");

  const validation = validateNewPassword(password, confirmation);
  if (!validation.ok) {
    return { status: "error", message: validation.message };
  }

  try {
    const supabase = await createClient();
    const { data, error: userError } = await supabase.auth.getUser();

    if (userError || !data.user) {
      return { status: "error", message: SESSION_ENDED };
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      return { status: "error", message: PASSWORD_CHANGE_FAILED };
    }

    return { status: "success", message: PASSWORD_CHANGED };
  } catch (error) {
    if (error instanceof MissingSupabaseConfigError) {
      return { status: "error", message: error.message };
    }
    return { status: "error", message: NETWORK_ERROR };
  }
}

export async function signOut() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // Still send the user to the login screen. The proxy refreshes the
    // session cookies on the next request.
  }

  redirect("/login");
}
