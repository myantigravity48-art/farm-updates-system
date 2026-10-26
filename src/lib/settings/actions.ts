"use server";

import { revalidatePath } from "next/cache";
import { NETWORK_ERROR, SESSION_ENDED } from "@/lib/auth/messages";
import { createClient } from "@/lib/supabase/server";
import { validateDisplayName } from "./display-name";

export interface DisplayNameState {
  status: "idle" | "error" | "success";
  message?: string;
}

export const initialDisplayNameState: DisplayNameState = { status: "idle" };

function readField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/** Saves the display name in user metadata. Never logs the email or metadata. */
export async function saveDisplayName(
  _previous: DisplayNameState,
  formData: FormData,
): Promise<DisplayNameState> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) return { status: "error", message: SESSION_ENDED };

    const validation = validateDisplayName(readField(formData, "displayName"));
    if (!validation.ok || !validation.value) {
      return {
        status: "error",
        message: validation.error ?? "Enter a display name.",
      };
    }

    const { error: updateError } = await supabase.auth.updateUser({
      data: { display_name: validation.value },
    });

    if (updateError) {
      return { status: "error", message: "Could not save the display name. Try again." };
    }

    revalidatePath("/", "layout");
    revalidatePath("/settings");
    return { status: "success", message: "Display name saved" };
  } catch {
    return { status: "error", message: NETWORK_ERROR };
  }
}
