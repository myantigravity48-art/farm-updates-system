"use client";

import { useEffect, useRef, useState, useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  errorTextClass,
  hintTextClass,
  labelClass,
  textareaClass,
} from "@/components/ui/form-styles";
import { addNote, deleteNote, type NoteActionState } from "@/lib/notes/actions";
import { NOTE_BODY_MAX } from "@/lib/notes/validate";

const initialNoteActionState: NoteActionState = { status: "idle" };
import { formatLondonDateTime } from "@/lib/format/dates";
import type { FarmNote, FarmStageOption } from "@/lib/data/types";

const selectClass =
  "min-h-11 w-full rounded-[10px] border border-border bg-bg px-3 text-base text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export function NotesPanel({
  farmId,
  notes,
  stageOptions,
}: {
  farmId: string;
  notes: FarmNote[];
  stageOptions: FarmStageOption[];
}) {
  const [state, action, pending] = useActionState(addNote, initialNoteActionState);
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteNote,
    initialNoteActionState,
  );
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status !== "success") return;
    formRef.current?.reset();
  }, [state]);

  return (
    <section
      aria-labelledby="notes-heading"
      className="rounded-[14px] border border-border bg-surface"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-4 min-[768px]:px-5">
        <h2 id="notes-heading" className="font-display text-2xl font-light">
          Notes
        </h2>
        <p className="text-sm text-muted tabular-nums">
          {notes.length} {notes.length === 1 ? "entry" : "entries"}
        </p>
      </header>

      <form
        ref={formRef}
        action={action}
        className="border-b border-border px-4 py-5 min-[768px]:px-5"
      >
        <input type="hidden" name="farmId" value={farmId} />

        <label htmlFor="note-body" className={labelClass}>
          Add a field note
        </label>
        <textarea
          id="note-body"
          name="body"
          rows={4}
          maxLength={NOTE_BODY_MAX}
          required
          placeholder="Record a change, treatment or observation"
          className={textareaClass}
          aria-invalid={Boolean(state.fieldErrors?.body)}
          aria-describedby={state.fieldErrors?.body ? "note-body-error" : "note-body-hint"}
        />
        {state.fieldErrors?.body ? (
          <p id="note-body-error" className={errorTextClass}>
            {state.fieldErrors.body}
          </p>
        ) : (
          <p id="note-body-hint" className={`mt-2 ${hintTextClass}`}>
            Up to {NOTE_BODY_MAX} characters.
          </p>
        )}

        <div className="mt-4">
          <label htmlFor="note-stage" className={labelClass}>
            Link to a stage <span className={hintTextClass}>Optional</span>
          </label>
          <select
            id="note-stage"
            name="stageId"
            defaultValue=""
            className={selectClass}
            aria-invalid={Boolean(state.fieldErrors?.stageId)}
            aria-describedby={state.fieldErrors?.stageId ? "note-stage-error" : undefined}
          >
            <option value="">No stage</option>
            {stageOptions.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.position}. {stage.name}
              </option>
            ))}
          </select>
          {state.fieldErrors?.stageId ? (
            <p id="note-stage-error" className={errorTextClass}>
              {state.fieldErrors.stageId}
            </p>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-muted">Visible to both users.</span>
          <Button type="submit" disabled={pending} aria-busy={pending}>
            {pending ? "Adding…" : "Add note"}
          </Button>
        </div>

        <div aria-live="polite" aria-atomic="true" className="min-h-0">
          {state.message ? (
            <p
              className={`mt-3 text-sm ${
                state.status === "error" ? "text-overdue" : "text-primary"
              }`}
            >
              {state.message}
            </p>
          ) : null}
        </div>
      </form>

      <div aria-live="polite" aria-atomic="true" className="min-h-0">
        {deleteState.message && deleteState.status === "error" ? (
          <p className="px-4 pt-4 text-sm text-overdue min-[768px]:px-5">
            {deleteState.message}
          </p>
        ) : null}
      </div>

      {notes.length === 0 ? (
        <p className="px-4 py-8 text-sm text-muted min-[768px]:px-5">No notes yet</p>
      ) : (
        <ul className="divide-y divide-border">
          {notes.map((note) => {
            const timestamp = formatLondonDateTime(note.createdAt);
            const confirming = confirmId === note.id;

            return (
              <li key={note.id} className="px-4 py-4 min-[768px]:px-5">
                <p className="whitespace-pre-line break-words text-base">{note.body}</p>

                {note.stageName ? (
                  <p className="mt-2 text-sm text-muted">Stage: {note.stageName}</p>
                ) : null}

                <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                  <span>{note.authorName ?? "Author not recorded"}</span>
                  {timestamp ? <span className="tabular-nums">{timestamp}</span> : null}
                </p>

                <div className="mt-3">
                  {confirming ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm text-muted">Delete this note?</span>
                      <form action={deleteAction}>
                        <input type="hidden" name="farmId" value={farmId} />
                        <input type="hidden" name="noteId" value={note.id} />
                        <Button
                          type="submit"
                          variant="secondary"
                          disabled={deletePending}
                          aria-busy={deletePending}
                        >
                          {deletePending ? "Deleting…" : "Delete note"}
                        </Button>
                      </form>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setConfirmId(null)}
                        disabled={deletePending}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setConfirmId(note.id)}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
