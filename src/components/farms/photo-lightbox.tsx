"use client";

import { useEffect, useRef, useState, useActionState, type KeyboardEvent } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ImageOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { photoAltText } from "@/components/farms/photo-alt";
import { deletePhoto, type PhotoActionState } from "@/lib/photos/actions";
import { formatUkDate } from "@/lib/format/dates";
import type { FarmPhoto } from "@/lib/data/types";

const initialPhotoActionState: PhotoActionState = { status: "idle" };

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function PhotoLightbox({
  farmId,
  photos,
  startIndex,
  onClose,
}: {
  farmId: string;
  photos: FarmPhoto[];
  startIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const [confirming, setConfirming] = useState(false);
  const [state, deleteAction, pending] = useActionState(
    deletePhoto,
    initialPhotoActionState,
  );
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (state.status === "success") closeRef.current();
  }, [state]);

  useEffect(() => {
    const previous =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    return () => {
      document.body.style.overflow = originalOverflow;
      previous?.focus();
    };
  }, []);

  const photo = photos[index];

  const move = (delta: number) => {
    if (photos.length === 0) return;
    setIndex((current) => (current + delta + photos.length) % photos.length);
    setConfirming(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeRef.current();
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      move(1);
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      move(-1);
      return;
    }

    if (event.key !== "Tab") return;

    const panel = panelRef.current;
    if (!panel) return;

    const nodes = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (node) => node.offsetParent !== null,
    );

    if (nodes.length === 0) {
      event.preventDefault();
      panel.focus();
      return;
    }

    const first = nodes[0];
    const last = nodes[nodes.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  if (!photo) return null;

  const alt = photoAltText(photo);

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center p-0 min-[768px]:items-center min-[768px]:p-6"
      style={{ backgroundColor: "color-mix(in srgb, var(--bg) 92%, transparent)" }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Photo viewer"
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="relative flex h-full w-full flex-col overflow-hidden border border-border bg-surface text-text min-[768px]:h-auto min-[768px]:max-h-[92vh] min-[768px]:max-w-[1000px] min-[768px]:rounded-[14px]"
      >
        <header className="flex flex-none items-center gap-3 border-b border-border px-4 py-3 min-[768px]:px-5">
          <p className="text-sm text-muted tabular-nums">
            {index + 1} of {photos.length}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close photo viewer"
            className="ml-auto flex h-11 w-11 flex-none items-center justify-center rounded-[10px] text-muted hover:bg-raised hover:text-text"
          >
            <X aria-hidden="true" size={20} strokeWidth={1.5} />
          </button>
        </header>

        <div className="relative flex min-h-0 flex-1 items-center justify-center bg-bg">
          {photo.url ? (
            // Signed URL created on the server; never a public bucket URL.
            <Image
              src={photo.url}
              alt={alt}
              fill
              sizes="(min-width: 1000px) 900px, 100vw"
              unoptimized
              className="object-contain p-3 min-[768px]:p-5"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 py-16 text-muted">
              <ImageOff aria-hidden="true" size={28} strokeWidth={1.5} />
              <p className="text-sm">Photo unavailable</p>
            </div>
          )}
        </div>

        <footer className="flex flex-none flex-col gap-3 border-t border-border px-4 py-4 min-[768px]:flex-row min-[768px]:items-center min-[768px]:justify-between min-[768px]:px-5">
          <div className="min-w-0">
            <p className="break-words text-base">{photo.caption?.trim() || alt}</p>
            <p className="mt-1 text-sm text-muted tabular-nums">
              {photo.takenOn ? formatUkDate(photo.takenOn) : "Date not set"}
              {photo.authorName ? ` · ${photo.authorName}` : ""}
            </p>

            <div className="mt-3">
              {confirming ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted">Delete this photo?</span>
                  <form action={deleteAction}>
                    <input type="hidden" name="farmId" value={farmId} />
                    <input type="hidden" name="photoId" value={photo.id} />
                    <Button
                      type="submit"
                      variant="secondary"
                      disabled={pending}
                      aria-busy={pending}
                    >
                      {pending ? "Deleting…" : "Delete photo"}
                    </Button>
                  </form>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setConfirming(false)}
                    disabled={pending}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button type="button" variant="secondary" onClick={() => setConfirming(true)}>
                  Delete
                </Button>
              )}

              <div aria-live="polite" aria-atomic="true" className="min-h-0">
                {state.status === "error" && state.message ? (
                  <p className="mt-2 text-sm text-overdue">{state.message}</p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-none items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => move(-1)}
              aria-label="Previous photo"
              disabled={photos.length < 2}
            >
              <ChevronLeft aria-hidden="true" size={18} strokeWidth={1.5} />
              <span className="min-[768px]:sr-only">Previous</span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => move(1)}
              aria-label="Next photo"
              disabled={photos.length < 2}
            >
              <span className="min-[768px]:sr-only">Next</span>
              <ChevronRight aria-hidden="true" size={18} strokeWidth={1.5} />
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
