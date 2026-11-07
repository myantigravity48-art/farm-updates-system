"use client";

import Image from "next/image";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Check, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Toast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { getMarkDonePreviewData, markStageDone, undoStageDone } from "@/lib/mark-done/actions";
import { earlierStagesOpen, previewAfterDone, validateDoneInput } from "@/lib/mark-done/logic";
import { shrinkPhoto, PhotoDecodeError } from "@/lib/photos/shrink";
import { preparePhotoUpload, registerPhoto } from "@/lib/photos/actions";
import { PHOTO_BUCKET, PHOTO_FORMAT_MESSAGE, PHOTO_MAX_FILES, validatePhotoFile } from "@/lib/photos/validate";
import { parseCalendarDate } from "@/lib/farms/validate";

type PreviewResult = Awaited<ReturnType<typeof getMarkDonePreviewData>>;
type PreviewData = Extract<PreviewResult, { ok: true }> extends { data: infer D } ? D : never;

interface ContextValue {
  openMarkDone: (stageId: string | null | undefined) => void;
  showToast: (message: string) => void;
}

const MarkDoneContext = createContext<ContextValue | null>(null);

export function useMarkDone() {
  const context = useContext(MarkDoneContext);
  if (!context) throw new Error("Mark done controls require MarkDoneProvider.");
  return context;
}

export function MarkDoneProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [stageId, setStageId] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [fileErrors, setFileErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [liveMessage, setLiveMessage] = useState("");
  const [toast, setToast] = useState<{ message: string; stageId?: string; status?: "success" | "error" } | null>(null);

  const openMarkDone = (id: string | null | undefined) => {
    if (!id) return;
    setStageId(id);
    setPreview(null);
    setDate("");
    setNote("");
    setFiles([]);
    setFileErrors({});
    setSaved(false);
    setError("");
    setLoading(true);
    void getMarkDonePreviewData(id).then((result) => {
      if (!result.ok) {
        setError(result.message);
      } else {
        setPreview(result.data);
        setDate(result.data.today);
      }
      setLoading(false);
    }).catch(() => {
      setError("Could not load this stage. Try again.");
      setLoading(false);
    });
  };

  const closePanel = () => {
    if (pending) return;
    const oldPreview = preview;
    const oldStageId = stageId;
    setStageId(null);
    setPreview(null);
    if (saved && oldPreview && oldStageId) {
      setToast({ message: `${oldPreview.stageName} marked done`, stageId: oldStageId });
    }
  };

  const onFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (selected.length > PHOTO_MAX_FILES) {
      setError(`Choose up to ${PHOTO_MAX_FILES} photos at a time.`);
      return;
    }
    setError("");
    setFiles(selected);
    setFileErrors({});
  };

  const finishPhotos = async (savedStage: PreviewData, doneDate: string, selectedFiles: File[]) => {
    const supabase = createClient();
    const failures: Record<string, string> = {};
    for (const [index, file] of selectedFiles.entries()) {
      const key = `${file.name}-${file.lastModified}-${index}`;
      setLiveMessage(`Uploading ${file.name}.`);
      const inputError = validatePhotoFile(file);
      if (inputError) {
        failures[key] = inputError;
        continue;
      }
      try {
        let blob: Blob;
        try {
          blob = await shrinkPhoto(file);
        } catch (cause) {
          failures[key] = cause instanceof PhotoDecodeError ? PHOTO_FORMAT_MESSAGE : "Could not prepare this photo. Try again.";
          continue;
        }
        const prepared = await preparePhotoUpload(savedStage.farmId);
        if (!prepared.path) {
          failures[key] = prepared.error ?? "Could not start the upload. Try again.";
          continue;
        }
        const { error: uploadError } = await supabase.storage.from(PHOTO_BUCKET).upload(prepared.path, blob, {
          contentType: "image/jpeg", upsert: false, cacheControl: "3600",
        });
        if (uploadError) {
          failures[key] = "Could not upload this photo. Try again.";
          continue;
        }
        const registered = await registerPhoto({
          farmId: savedStage.farmId,
          path: prepared.path,
          caption: "",
          takenOn: doneDate,
          stageId: savedStage.stageId,
        });
        if (!registered.ok) {
          await supabase.storage.from(PHOTO_BUCKET).remove([prepared.path]);
          failures[key] = registered.error ?? "Could not save this photo. Try again.";
        }
      } catch {
        failures[key] = "Could not upload this photo. Try again.";
      }
    }
    setFileErrors(failures);
    router.refresh();
    const failureCount = Object.keys(failures).length;
    if (failureCount) {
      const photoWord = failureCount === 1 ? "photo" : "photos";
      setLiveMessage(`Marked done. ${failureCount} ${photoWord} did not upload. Add it from the Photos tab.`);
    } else {
      setStageId(null);
      setPreview(null);
      setToast({ message: `${savedStage.stageName} marked done`, stageId: savedStage.stageId });
    }
    setPending(false);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!preview || !stageId || pending || saved) return;
    const validation = validateDoneInput({
      date,
      note,
      today: preview.today,
      stage: { triggerType: preview.stageTriggerType },
      plantingDate: preview.plantingDate,
    });
    if (validation) { setError(validation); return; }
    setError("");
    setPending(true);
    setLiveMessage("Marking stage done.");
    const result = await markStageDone(stageId, date, note);
    if (!result.ok) {
      setError(result.message);
      setLiveMessage("");
      setPending(false);
      return;
    }
    setSaved(true);
    if (files.length) {
      await finishPhotos(preview, date, files);
      return;
    }
    setPending(false);
    setStageId(null);
    setPreview(null);
    router.refresh();
    setToast({ message: `${preview.stageName} marked done`, stageId });
  };

  const undo = async (undoId: string) => {
    setToast(null);
    const result = await undoStageDone(undoId);
    if (!result.ok) setToast({ message: result.message, status: "error" });
    else {
      router.refresh();
      setToast({ message: "Stage marked not done" });
    }
  };

  const previewText = useMemo(() => {
    const validDate = parseCalendarDate(date);
    if (!preview || !validDate) return "";
    return previewAfterDone({
      templates: preview.templates,
      windows: preview.windows,
      farm: preview.farm,
      stages: preview.stages,
      stagePosition: preview.stagePosition,
    }, validDate);
  }, [preview, date]);
  const earlier = preview ? earlierStagesOpen(preview.stageRows, preview.stagePosition) : [];
  const previews = useMemo(() => files.map((file) => ({
    file,
    url: URL.createObjectURL(file),
    key: `${file.name}-${file.lastModified}`,
  })), [files]);
  useEffect(() => () => previews.forEach((item) => URL.revokeObjectURL(item.url)), [previews]);

  return (
    <MarkDoneContext.Provider value={{ openMarkDone, showToast: (message) => setToast({ message }) }}>
      {children}
      {stageId ? (
        <Modal onClose={closePanel} labelledBy="mark-done-heading" presentation="drawer">
          <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
            <header className="border-b border-border px-5 pb-5 pt-6 min-[768px]:px-7">
              <span aria-hidden="true" className="mx-auto mb-3 block h-1 w-9 rounded-full bg-border min-[768px]:hidden" />
              <div className="pr-10">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">Field record</p>
                <h2 id="mark-done-heading" className="mt-2 font-display text-3xl font-light leading-tight">
                  {preview ? `Mark ${preview.stageName} done` : "Mark stage done"}
                </h2>
                {preview ? <p className="mt-2 text-sm text-muted">{preview.farmName}</p> : null}
              </div>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 min-[768px]:px-7">
              {loading ? <p role="status" className="text-sm text-muted">Loading stage details…</p> : null}
              {error ? <p role="alert" className="mb-4 text-sm text-overdue">{error}</p> : null}
              {preview && !saved ? (
                <>
                  <div className="mb-5 rounded-[10px] border border-border bg-raised px-4 py-3">
                    <p className="flex items-center gap-2 font-medium"><Check aria-hidden="true" size={18} />{preview.stageName}</p>
                    <p className="mt-1 text-sm text-muted">Stage {preview.stagePosition} for {preview.farmName}</p>
                  </div>
                  {earlier.length ? <p className="mb-5 rounded-[10px] border border-border px-4 py-3 text-sm text-muted">{earlier.join(", ")} not marked done yet. You can still mark this one.</p> : null}
                  <div>
                    <label htmlFor="mark-done-date" className="mb-2 block text-sm font-medium">{preview.stageWindowKey === "planting" ? "Planting date" : "Date done"}</label>
                    <input id="mark-done-date" data-autofocus type="date" required value={date} max={preview.today} onChange={(event) => setDate(event.target.value)} className="min-h-11 w-full rounded-[10px] border border-border bg-bg px-3 text-base text-text" />
                    {preview.stageWindowKey === "planting" ? <p className="mt-2 text-sm text-muted">Later jobs are scheduled from this date</p> : null}
                  </div>
                  <div className="mt-5">
                    <label htmlFor="mark-done-note" className="mb-2 block text-sm font-medium">Note <span className="font-normal text-muted">Optional</span></label>
                    <textarea id="mark-done-note" value={note} maxLength={1000} onChange={(event) => setNote(event.target.value)} rows={4} placeholder="Add a short note about the work" className="min-h-28 w-full rounded-[10px] border border-border bg-bg px-3 py-3 text-base text-text" />
                    <p className="mt-2 text-sm text-muted tabular-nums">{note.length} of 1000 characters</p>
                  </div>
                  <div className="mt-5">
                    <label htmlFor="mark-done-photos" className="mb-2 block text-sm font-medium">Add photos <span className="font-normal text-muted">Optional · multiple</span></label>
                    <label htmlFor="mark-done-photos" className="flex min-h-16 cursor-pointer items-center gap-3 rounded-[10px] border border-dashed border-border bg-raised px-4 py-3">
                      <ImagePlus aria-hidden="true" size={20} className="text-primary" />
                      <span><span className="block font-medium">Choose photos</span><span className="text-sm text-muted">JPEG, PNG or WebP</span></span>
                    </label>
                    <input id="mark-done-photos" type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={onFiles} />
                    {previews.length ? <ul className="mt-3 grid grid-cols-4 gap-2" aria-label="Selected photos">{previews.map((item) => <li key={item.key} className="relative aspect-square overflow-hidden rounded-[10px] border border-border bg-raised"><Image src={item.url} alt={item.file.name} fill unoptimized sizes="80px" className="object-cover" />{fileErrors[`${item.file.name}-${item.file.lastModified}-${files.indexOf(item.file)}`] ? <span className="absolute inset-x-0 bottom-0 bg-bg/90 p-1 text-[11px] text-overdue">{fileErrors[`${item.file.name}-${item.file.lastModified}-${files.indexOf(item.file)}`]}</span> : null}</li>)}</ul> : null}
                  </div>
                </>
              ) : null}
              {saved && Object.keys(fileErrors).length ? <div role="alert" className="space-y-3"><p className="text-sm text-overdue">Marked done. {Object.keys(fileErrors).length} {Object.keys(fileErrors).length === 1 ? "photo did" : "photos did"} not upload. Add it from the Photos tab.</p><ul className="space-y-2">{Object.entries(fileErrors).map(([key, message]) => <li key={key} className="rounded-[10px] border border-border px-3 py-2 text-sm"><span className="block font-medium">{key.split("-").slice(0, -2).join("-")}</span><span className="text-muted">{message}</span></li>)}</ul></div> : null}
              <div aria-live="polite" aria-atomic="true" className="mt-3 min-h-5 text-sm text-muted">{liveMessage}</div>
            </div>
            <footer className="border-t border-border px-5 py-4 min-[768px]:px-7">
              <div className="flex flex-col gap-2">
                {saved ? <Button type="button" onClick={closePanel}>Close</Button> : <>
                  <Button type="submit" disabled={!preview || loading || pending} aria-busy={pending}>{pending ? "Saving…" : "Mark done"}</Button>
                  {previewText ? <p className="text-center text-sm text-muted">{previewText}</p> : null}
                  <Button type="button" variant="secondary" onClick={closePanel} disabled={pending}>Cancel</Button>
                </>}
              </div>
            </footer>
          </form>
        </Modal>
      ) : null}
      {toast ? <Toast message={toast.message} status={toast.status} onDismiss={() => setToast(null)} durationMs={toast.stageId ? 10000 : 5000} action={toast.stageId ? { label: "Undo", onClick: () => void undo(toast.stageId!) } : undefined} /> : null}
    </MarkDoneContext.Provider>
  );
}
