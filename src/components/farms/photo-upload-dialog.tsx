"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  errorTextClass,
  hintTextClass,
  inputClass,
  labelClass,
} from "@/components/ui/form-styles";
import { createClient } from "@/lib/supabase/client";
import { preparePhotoUpload, registerPhoto } from "@/lib/photos/actions";
import { shrinkPhoto, PhotoDecodeError } from "@/lib/photos/shrink";
import {
  PHOTO_BUCKET,
  PHOTO_CAPTION_MAX,
  PHOTO_FORMAT_MESSAGE,
  PHOTO_MAX_FILES,
  validatePhotoCaption,
  validatePhotoFile,
  validateTakenOn,
} from "@/lib/photos/validate";
import type { CalendarDate } from "@/lib/schedule";
import type { FarmStageOption } from "@/lib/data/types";

type UploadStatus = "ready" | "preparing" | "uploading" | "saving" | "done" | "error";

interface UploadItem {
  key: string;
  file: File;
  status: UploadStatus;
  message?: string;
}

const progressValue: Record<UploadStatus, number> = {
  ready: 0,
  preparing: 25,
  uploading: 60,
  saving: 85,
  done: 100,
  error: 0,
};

const statusLabel: Record<UploadStatus, string> = {
  ready: "Ready",
  preparing: "Preparing",
  uploading: "Uploading",
  saving: "Saving",
  done: "Added",
  error: "Failed",
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const selectClass =
  "min-h-11 w-full rounded-[10px] border border-border bg-bg px-3 text-base text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export function PhotoUploadDialog({
  farmId,
  files,
  today,
  stageOptions,
  onClose,
  onUploaded,
}: {
  farmId: string;
  files: File[];
  today: CalendarDate;
  stageOptions: FarmStageOption[];
  onClose: () => void;
  onUploaded: () => void;
}) {
  const [items, setItems] = useState<UploadItem[]>(() =>
    files.map((file, index) => {
      const error = validatePhotoFile(file);
      return {
        key: `${file.name}-${file.lastModified}-${index}`,
        file,
        status: error ? "error" : "ready",
        message: error ?? undefined,
      };
    }),
  );
  const [caption, setCaption] = useState("");
  const [takenOn, setTakenOn] = useState<string>(today);
  const [stageId, setStageId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [liveMessage, setLiveMessage] = useState("");
  const [running, setRunning] = useState(false);

  const uploadable = items.some((item) => item.status === "ready");

  const update = (key: string, patch: Partial<UploadItem>) => {
    setItems((current) =>
      current.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    );
  };

  const uploadAll = async () => {
    if (running) return;

    const captionError = validatePhotoCaption(caption);
    if (captionError) {
      setFormError(captionError);
      return;
    }

    const taken = validateTakenOn(takenOn, today);
    if (!taken.value) {
      setFormError(taken.error ?? "Enter a valid date.");
      return;
    }

    setFormError(null);
    setRunning(true);
    setLiveMessage(`Uploading ${items.length} ${items.length === 1 ? "photo" : "photos"}.`);

    const supabase = createClient();
    let successes = 0;
    let failures = 0;

    for (const item of items) {
      if (item.status === "error" && item.message) {
        failures += 1;
        continue;
      }

      update(item.key, { status: "preparing", message: undefined });

      try {
        const formatError = validatePhotoFile(item.file);
        if (formatError) {
          failures += 1;
          update(item.key, { status: "error", message: formatError });
          continue;
        }

        let blob: Blob;
        try {
          blob = await shrinkPhoto(item.file);
        } catch (error) {
          failures += 1;
          update(item.key, {
            status: "error",
            message:
              error instanceof PhotoDecodeError
                ? PHOTO_FORMAT_MESSAGE
                : "Could not prepare this photo. Try again.",
          });
          setLiveMessage(`${item.file.name}: could not prepare.`);
          continue;
        }

        const prepared = await preparePhotoUpload(farmId);
        if (!prepared.path) {
          failures += 1;
          update(item.key, {
            status: "error",
            message: prepared.error ?? "Could not start the upload. Try again.",
          });
          setLiveMessage(`${item.file.name}: could not start the upload.`);
          continue;
        }

        update(item.key, { status: "uploading" });

        const { error: uploadError } = await supabase.storage
          .from(PHOTO_BUCKET)
          .upload(prepared.path, blob, {
            contentType: "image/jpeg",
            upsert: false,
            cacheControl: "3600",
          });

        if (uploadError) {
          failures += 1;
          update(item.key, {
            status: "error",
            message: "Could not upload this photo. Try again.",
          });
          setLiveMessage(`${item.file.name}: upload failed.`);
          continue;
        }

        update(item.key, { status: "saving" });

        const registered = await registerPhoto({
          farmId,
          path: prepared.path,
          caption,
          takenOn: taken.value,
          stageId,
        });

        if (!registered.ok) {
          await supabase.storage.from(PHOTO_BUCKET).remove([prepared.path]);
          failures += 1;
          update(item.key, {
            status: "error",
            message: registered.error ?? "Could not save the photo. Try again.",
          });
          setLiveMessage(`${item.file.name}: could not be saved.`);
          continue;
        }

        successes += 1;
        update(item.key, { status: "done" });
        setLiveMessage(`${item.file.name}: added.`);
      } catch {
        failures += 1;
        update(item.key, {
          status: "error",
          message: "Could not upload this photo. Try again.",
        });
        setLiveMessage(`${item.file.name}: upload failed.`);
      }
    }

    setRunning(false);

    if (successes > 0) onUploaded();

    if (failures === 0) {
      setLiveMessage(
        `${successes} ${successes === 1 ? "photo" : "photos"} added.`,
      );
      onClose();
    } else {
      setLiveMessage(
        `${successes} added, ${failures} ${failures === 1 ? "photo" : "photos"} failed.`,
      );
    }
  };

  return (
    <Modal
      onClose={() => {
        if (!running) onClose();
      }}
      labelledBy="photo-upload-heading"
    >
      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          void uploadAll();
        }}
      >
        <header className="border-b border-border px-5 pb-5 pt-6 min-[768px]:px-7">
          <div className="pr-10">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
              Photos
            </p>
            <h2 id="photo-upload-heading" className="font-display text-3xl font-light leading-tight">
              Add photos
            </h2>
            <p className="mt-2 text-sm text-muted">
              {items.length} {items.length === 1 ? "photo" : "photos"} selected. Shrunk to 1600px
              and saved as JPEG. Up to {PHOTO_MAX_FILES} at a time.
            </p>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 min-[768px]:px-7">
          {formError ? (
            <p role="alert" className={`${errorTextClass} mt-0`}>
              {formError}
            </p>
          ) : null}

          <ul className="mt-4 space-y-3" aria-label="Selected photos">
            {items.map((item) => {
              const failed = item.status === "error";
              return (
                <li
                  key={item.key}
                  className="rounded-[10px] border border-border bg-bg px-3 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <p className="min-w-0 flex-1 truncate text-sm">{item.file.name}</p>
                    <p
                      className={`text-sm tabular-nums ${failed ? "text-overdue" : "text-muted"}`}
                    >
                      {statusLabel[item.status]}
                    </p>
                  </div>
                  <div
                    role="progressbar"
                    aria-label={`Upload progress for ${item.file.name}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progressValue[item.status]}
                    className="mt-2 h-1.5 overflow-hidden rounded-full bg-raised"
                  >
                    <span
                      className={`block h-full rounded-full ${failed ? "bg-overdue" : "bg-primary"}`}
                      style={{ width: `${progressValue[item.status]}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-sm text-muted tabular-nums">
                    {formatFileSize(item.file.size)}
                  </p>
                  {item.message ? (
                    <p className={`mt-1.5 text-sm ${failed ? "text-overdue" : "text-muted"}`}>
                      {item.message}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>

          <div aria-live="polite" aria-atomic="true" className="mt-4 min-h-0">
            {liveMessage ? <p className="text-sm text-muted">{liveMessage}</p> : null}
          </div>

          <div className="mt-6 space-y-5">
            <div>
              <label htmlFor="photo-caption" className={labelClass}>
                Caption <span className={hintTextClass}>Optional</span>
              </label>
              <input
                id="photo-caption"
                type="text"
                value={caption}
                maxLength={PHOTO_CAPTION_MAX}
                onChange={(event) => setCaption(event.target.value)}
                disabled={running}
                placeholder="What does this photo show?"
                className={inputClass}
              />
              <p className={`mt-2 ${hintTextClass} tabular-nums`}>
                Applies to every photo in this batch. {caption.trim().length} of{" "}
                {PHOTO_CAPTION_MAX} characters
              </p>
            </div>

            <div>
              <label htmlFor="photo-taken-on" className={labelClass}>
                Taken on
              </label>
              <input
                id="photo-taken-on"
                type="date"
                value={takenOn}
                max={today}
                onChange={(event) => setTakenOn(event.target.value)}
                disabled={running}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="photo-stage" className={labelClass}>
                Link to a stage <span className={hintTextClass}>Optional</span>
              </label>
              <select
                id="photo-stage"
                value={stageId}
                onChange={(event) => setStageId(event.target.value)}
                disabled={running}
                className={selectClass}
              >
                <option value="">No stage</option>
                {stageOptions.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.position}. {stage.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {running ? (
            <p className="mt-4 text-sm text-muted">
              Keep this window open until every photo finishes.
            </p>
          ) : null}
        </div>

        <footer className="flex flex-wrap gap-3 border-t border-border px-5 py-4 min-[768px]:justify-end min-[768px]:px-7">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={running}
            className="flex-1 min-[768px]:flex-none"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={running || !uploadable}
            aria-busy={running}
            className="flex-1 min-[768px]:flex-none"
          >
            {running ? "Uploading…" : "Upload photos"}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}
