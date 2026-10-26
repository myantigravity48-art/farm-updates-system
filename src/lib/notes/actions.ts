"use server";

import { revalidatePath } from "next/cache";
import { authorNameFromUser } from "@/lib/auth/author-name";
import { NETWORK_ERROR, SESSION_ENDED } from "@/lib/auth/messages";
import { createClient } from "@/lib/supabase/server";
import { validateNote, type NoteFieldErrors } from "./validate";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export interface NoteActionState {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: NoteFieldErrors;
}

export const initialNoteActionState: NoteActionState = { status: "idle" };

function readField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

async function signedInClient(): Promise<{ supabase: SupabaseClient; authorName: string } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { supabase, authorName: authorNameFromUser(data.user) };
}

/** Adds a note to a farm. Every input is validated on the server. */
export async function addNote(
  _previous: NoteActionState,
  formData: FormData,
): Promise<NoteActionState> {
  try {
    const session = await signedInClient();
    if (!session) return { status: "error", message: SESSION_ENDED };
    const { supabase, authorName } = session;

    const farmId = readField(formData, "farmId").trim();
    if (!UUID.test(farmId)) return { status: "error", message: "That farm could not be found." };

    const { data: farm, error: farmError } = await supabase
      .from("farms")
      .select("id")
      .eq("id", farmId)
      .maybeSingle();

    if (farmError) return { status: "error", message: "Could not add the note. Try again." };
    if (!farm) return { status: "error", message: "That farm could not be found." };

    const { data: stageRows, error: stageError } = await supabase
      .from("farm_stages")
      .select("id")
      .eq("farm_id", farmId);

    if (stageError) return { status: "error", message: "Could not add the note. Try again." };

    const validation = validateNote(
      { body: readField(formData, "body"), stageId: readField(formData, "stageId") },
      { stageIds: (stageRows ?? []).map((row) => row.id) },
    );

    if (!validation.ok || !validation.values) {
      return {
        status: "error",
        message: "Fix the highlighted fields and try again.",
        fieldErrors: validation.errors,
      };
    }

    const { error } = await supabase.from("notes").insert({
      farm_id: farmId,
      farm_stage_id: validation.values.stageId,
      body: validation.values.body,
      author_name: authorName,
    });

    if (error) return { status: "error", message: "Could not add the note. Try again." };

    revalidatePath(`/farms/${farmId}`);
    return { status: "success", message: "Note added" };
  } catch {
    return { status: "error", message: NETWORK_ERROR };
  }
}

/** Deletes one note. RLS limits this to signed-in users. */
export async function deleteNote(
  _previous: NoteActionState,
  formData: FormData,
): Promise<NoteActionState> {
  try {
    const session = await signedInClient();
    if (!session) return { status: "error", message: SESSION_ENDED };
    const { supabase } = session;

    const farmId = readField(formData, "farmId").trim();
    const noteId = readField(formData, "noteId").trim();

    if (!UUID.test(farmId) || !UUID.test(noteId)) {
      return { status: "error", message: "That note could not be found." };
    }

    const { data, error } = await supabase
      .from("notes")
      .delete()
      .eq("id", noteId)
      .eq("farm_id", farmId)
      .select("id")
      .maybeSingle();

    if (error) return { status: "error", message: "Could not delete the note. Try again." };
    if (!data) return { status: "error", message: "That note could not be found." };

    revalidatePath(`/farms/${farmId}`);
    return { status: "success", message: "Note deleted" };
  } catch {
    return { status: "error", message: NETWORK_ERROR };
  }
}
