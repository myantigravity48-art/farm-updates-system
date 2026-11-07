"use server";

import { revalidatePath } from "next/cache";
import { authorNameFromUser } from "@/lib/auth/author-name";
import { NETWORK_ERROR, SESSION_ENDED } from "@/lib/auth/messages";
import { todayInLondon } from "@/lib/schedule";
import {
  PHOTO_BUCKET,
  isValidPhotoPath,
  photoFileName,
  validatePhotoCaption,
  validateTakenOn,
} from "@/lib/photos/validate";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export interface PreparePhotoResult {
  path: string | null;
  error?: string;
}

export interface RegisterPhotoResult {
  ok: boolean;
  error?: string;
}

export interface PhotoActionState {
  status: "idle" | "error" | "success";
  message?: string;
}

interface RegisterPhotoInput {
  farmId: string;
  path: string;
  caption: string;
  takenOn: string;
  stageId: string;
}

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

async function farmExists(supabase: SupabaseClient, farmId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("farms")
    .select("id")
    .eq("id", farmId)
    .maybeSingle();

  return !error && Boolean(data);
}

/**
 * Step (b) of the upload flow: validates the farm and returns the only path the
 * browser is allowed to upload to. The uuid is generated on the server.
 */
export async function preparePhotoUpload(farmId: string): Promise<PreparePhotoResult> {
  try {
    const session = await signedInClient();
    if (!session) return { path: null, error: SESSION_ENDED };

    const id = typeof farmId === "string" ? farmId.trim() : "";
    if (!UUID.test(id)) return { path: null, error: "That farm could not be found." };

    if (!(await farmExists(session.supabase, id))) {
      return { path: null, error: "That farm could not be found." };
    }

    return { path: `${id}/${crypto.randomUUID()}.jpg` };
  } catch {
    return { path: null, error: NETWORK_ERROR };
  }
}

/**
 * Step (d): verifies the uploaded object and inserts the photos row. Any
 * failure after the path is accepted deletes the object so nothing is orphaned.
 */
export async function registerPhoto(input: RegisterPhotoInput): Promise<RegisterPhotoResult> {
  let supabase: SupabaseClient | null = null;
  let acceptedPath: string | null = null;

  try {
    const session = await signedInClient();
    if (!session) return { ok: false, error: SESSION_ENDED };
    supabase = session.supabase;

    const farmId = typeof input.farmId === "string" ? input.farmId.trim() : "";
    const path = typeof input.path === "string" ? input.path.trim() : "";

    if (!UUID.test(farmId) || !isValidPhotoPath(path, farmId)) {
      return { ok: false, error: "That photo could not be saved. Try again." };
    }
    acceptedPath = path;

    if (!(await farmExists(supabase, farmId))) {
      await removeObject(supabase, path);
      return { ok: false, error: "That farm could not be found." };
    }

    const caption = typeof input.caption === "string" ? input.caption : "";
    const captionError = validatePhotoCaption(caption);
    if (captionError) {
      await removeObject(supabase, path);
      return { ok: false, error: captionError };
    }

    const taken = validateTakenOn(
      typeof input.takenOn === "string" ? input.takenOn : "",
      todayInLondon(new Date()),
    );
    if (!taken.value) {
      await removeObject(supabase, path);
      return { ok: false, error: taken.error ?? "Enter a valid date." };
    }

    let stageId: string | null = null;
    const rawStageId = typeof input.stageId === "string" ? input.stageId.trim() : "";
    if (rawStageId) {
      const { data: stage } = await supabase
        .from("farm_stages")
        .select("id")
        .eq("id", rawStageId)
        .eq("farm_id", farmId)
        .maybeSingle();

      if (!stage) {
        await removeObject(supabase, path);
        return { ok: false, error: "Choose a stage from this farm." };
      }
      stageId = stage.id;
    }

    const fileName = photoFileName(path);
    const { data: objects, error: listError } = await supabase.storage
      .from(PHOTO_BUCKET)
      .list(farmId, { search: fileName, limit: 1 });

    if (listError || !objects?.some((object) => object.name === fileName)) {
      await removeObject(supabase, path);
      return { ok: false, error: "The photo did not finish uploading. Try again." };
    }

    const { error } = await supabase.from("photos").insert({
      farm_id: farmId,
      farm_stage_id: stageId,
      storage_path: path,
      caption: caption.trim() || null,
      taken_on: taken.value,
      author_name: session.authorName,
    });

    if (error) {
      await removeObject(supabase, path);
      return { ok: false, error: "Could not save the photo. Try again." };
    }

    revalidatePath(`/farms/${farmId}`);
    return { ok: true };
  } catch {
    if (supabase && acceptedPath) {
      await removeObject(supabase, acceptedPath).catch(() => undefined);
    }
    return { ok: false, error: NETWORK_ERROR };
  }
}

/** Deletes a photo row and its storage object. */
export async function deletePhoto(
  _previous: PhotoActionState,
  formData: FormData,
): Promise<PhotoActionState> {
  try {
    const session = await signedInClient();
    if (!session) return { status: "error", message: SESSION_ENDED };
    const { supabase } = session;

    const farmId = readField(formData, "farmId").trim();
    const photoId = readField(formData, "photoId").trim();

    if (!UUID.test(farmId) || !UUID.test(photoId)) {
      return { status: "error", message: "That photo could not be found." };
    }

    const { data: photo, error: readError } = await supabase
      .from("photos")
      .select("id, storage_path")
      .eq("id", photoId)
      .eq("farm_id", farmId)
      .maybeSingle();

    if (readError) return { status: "error", message: "Could not delete the photo. Try again." };
    if (!photo) return { status: "error", message: "That photo could not be found." };

    if (isValidPhotoPath(photo.storage_path, farmId)) {
      const { error: removeError } = await removeObject(supabase, photo.storage_path);
      if (removeError) {
        return { status: "error", message: "Could not delete the photo. Try again." };
      }
    }

    const { error } = await supabase
      .from("photos")
      .delete()
      .eq("id", photoId)
      .eq("farm_id", farmId);

    if (error) return { status: "error", message: "Could not delete the photo. Try again." };

    revalidatePath(`/farms/${farmId}`);
    return { status: "success", message: "Photo deleted" };
  } catch {
    return { status: "error", message: NETWORK_ERROR };
  }
}

async function removeObject(
  supabase: SupabaseClient,
  path: string,
): Promise<{ error: boolean }> {
  const { error } = await supabase.storage.from(PHOTO_BUCKET).remove([path]);
  return { error: Boolean(error) };
}
