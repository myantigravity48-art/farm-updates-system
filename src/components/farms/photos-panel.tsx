"use client";

import { useRef, useState, type ChangeEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ImageOff, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhotoLightbox } from "@/components/farms/photo-lightbox";
import { PhotoUploadDialog } from "@/components/farms/photo-upload-dialog";
import { photoAltText } from "@/components/farms/photo-alt";
import { formatUkShortDate } from "@/lib/format/dates";
import { PHOTO_MAX_FILES } from "@/lib/photos/validate";
import type { CalendarDate } from "@/lib/schedule";
import type { FarmPhoto, FarmStageOption } from "@/lib/data/types";

export function PhotosPanel({
  farmId,
  photos,
  today,
  stageOptions,
}: {
  farmId: string;
  photos: FarmPhoto[];
  today: CalendarDate;
  stageOptions: FarmStageOption[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [uploadFiles, setUploadFiles] = useState<File[] | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);

  const onFilesSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (selected.length === 0) return;

    if (selected.length > PHOTO_MAX_FILES) {
      setSelectionError(`Choose up to ${PHOTO_MAX_FILES} photos at a time.`);
      return;
    }

    setSelectionError(null);
    setUploadFiles(selected);
  };

  return (
    <section
      aria-labelledby="photos-heading"
      className="rounded-[14px] border border-border bg-surface"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 min-[768px]:px-5">
        <div>
          <h2 id="photos-heading" className="font-display text-2xl font-light">
            Photos
          </h2>
          <p className="text-sm text-muted tabular-nums">
            {photos.length} {photos.length === 1 ? "image" : "images"}
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus aria-hidden="true" size={18} strokeWidth={1.5} />
          Add photos
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="sr-only"
          onChange={onFilesSelected}
          aria-label="Choose photos"
        />
      </header>

      <div aria-live="polite" aria-atomic="true" className="min-h-0">
        {selectionError ? (
          <p className="px-4 pt-4 text-sm text-overdue min-[768px]:px-5">{selectionError}</p>
        ) : null}
      </div>

      {photos.length === 0 ? (
        <p className="px-4 py-8 text-sm text-muted min-[768px]:px-5">No photos yet</p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 px-4 py-5 min-[480px]:grid-cols-3 min-[768px]:px-5">
          {photos.map((photo, index) => {
            const alt = photoAltText(photo);
            return (
              <li key={photo.id} className="min-w-0">
                <button
                  type="button"
                  onClick={() => setLightboxIndex(index)}
                  className="block w-full rounded-[10px] text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  aria-label={`Open photo: ${alt}`}
                >
                  <span className="relative block aspect-square overflow-hidden rounded-[10px] border border-border bg-raised">
                    {photo.url ? (
                      <Image
                        src={photo.url}
                        alt={alt}
                        fill
                        sizes="(min-width: 480px) 160px, 45vw"
                        unoptimized
                        className="object-cover"
                      />
                    ) : (
                      <span className="flex h-full w-full flex-col items-center justify-center gap-2 px-2 text-muted">
                        <ImageOff aria-hidden="true" size={22} strokeWidth={1.5} />
                        <span className="text-center text-sm">Photo unavailable</span>
                      </span>
                    )}
                  </span>
                  {photo.caption?.trim() ? (
                    <span className="mt-2 line-clamp-2 block text-sm">{photo.caption.trim()}</span>
                  ) : null}
                  <span className="mt-1 block text-sm text-muted tabular-nums">
                    {photo.takenOn ? formatUkShortDate(photo.takenOn) : "Date not set"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {uploadFiles ? (
        <PhotoUploadDialog
          farmId={farmId}
          files={uploadFiles}
          today={today}
          stageOptions={stageOptions}
          onClose={() => setUploadFiles(null)}
          onUploaded={() => router.refresh()}
        />
      ) : null}

      {lightboxIndex !== null && photos[lightboxIndex] ? (
        <PhotoLightbox
          farmId={farmId}
          photos={photos}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      ) : null}
    </section>
  );
}
