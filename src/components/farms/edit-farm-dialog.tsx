"use client";

import { Leaf } from "lucide-react";
import { useActionState, useEffect, useId, useRef, useState, type ChangeEvent } from "react";
import { ErrorSummary } from "@/components/farms/error-summary";
import { Button } from "@/components/ui/button";
import {
  errorTextClass,
  hintTextClass,
  inputClass,
  labelClass,
  textareaClass,
} from "@/components/ui/form-styles";
import { Modal } from "@/components/ui/modal";
import { updateFarm } from "@/lib/farms/actions";
import { initialFarmFormState } from "@/lib/farms/form-state";
import { isSizeUnit, SIZE_UNITS } from "@/lib/farms/validate";

export interface EditableFarm {
  id: string;
  name: string;
  location: string | null;
  sizeValue: number | null;
  sizeUnit: string | null;
  notes: string | null;
}

export function EditFarmDialog({
  open,
  farm,
  onClose,
  onSaved,
}: {
  open: boolean;
  farm: EditableFarm;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  if (!open) return null;

  return <EditFarmDialogContent farm={farm} onClose={onClose} onSaved={onSaved} />;
}

function EditFarmDialogContent({
  farm,
  onClose,
  onSaved,
}: {
  farm: EditableFarm;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [state, action, pending] = useActionState(updateFarm, initialFarmFormState);
  const titleId = useId();
  const formId = useId();
  const notified = useRef(false);
  const onSavedRef = useRef(onSaved);
  const onCloseRef = useRef(onClose);
  const errors = state.fieldErrors ?? {};
  const unit = farm.sizeUnit && isSizeUnit(farm.sizeUnit) ? farm.sizeUnit : "";
  const [form, setForm] = useState({
    name: farm.name,
    location: farm.location ?? "",
    sizeValue: farm.sizeValue === null ? "" : String(farm.sizeValue),
    sizeUnit: unit,
    notes: farm.notes ?? "",
  });

  const setField =
    (field: keyof typeof form) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((current) => ({ ...current, [field]: event.target.value }));

  useEffect(() => {
    onSavedRef.current = onSaved;
    onCloseRef.current = onClose;
  }, [onSaved, onClose]);

  useEffect(() => {
    if (state.status !== "success" || notified.current) return;
    notified.current = true;
    onSavedRef.current(state.message ?? "Farm updated");
    onCloseRef.current();
  }, [state]);

  return (
    <Modal onClose={onClose} labelledBy={titleId}>
      <form action={action} className="flex min-h-0 flex-1 flex-col">
        <input type="hidden" name="farmId" value={farm.id} />
        <header className="border-b border-border px-5 pb-5 pt-6 min-[768px]:px-7">
          <div className="flex items-start gap-4 pr-10">
            <span className="flex h-11 w-11 flex-none items-center justify-center rounded-[10px] bg-raised text-primary">
              <Leaf aria-hidden="true" size={20} strokeWidth={1.5} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
                Farm record
              </p>
              <h2 id={titleId} className="font-display text-3xl font-light leading-tight">
                Edit farm
              </h2>
              <p className="mt-2 text-sm text-muted">
                Update the plot details. Planting and stage progress are not changed here.
              </p>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 min-[768px]:px-7">
          <ErrorSummary message={state.status === "error" ? state.message : undefined} errors={errors} />

          <div className="space-y-5">
            <div>
              <label htmlFor={`${formId}-name`} className={labelClass}>
                Farm name <span className={hintTextClass}>Required</span>
              </label>
              <input
                id={`${formId}-name`}
                name="name"
                type="text"
                autoComplete="off"
                className={inputClass}
                data-autofocus
                value={form.name}
                onChange={setField("name")}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? `${formId}-name-error` : undefined}
              />
              {errors.name ? (
                <p id={`${formId}-name-error`} className={errorTextClass}>
                  {errors.name}
                </p>
              ) : null}
            </div>

            <div className="grid gap-5 min-[560px]:grid-cols-2">
              <div>
                <label htmlFor={`${formId}-location`} className={labelClass}>
                  Location <span className={hintTextClass}>Optional</span>
                </label>
                <input
                  id={`${formId}-location`}
                  name="location"
                  type="text"
                  autoComplete="off"
                  placeholder="Village, LGA or state"
                  className={inputClass}
                  value={form.location}
                  onChange={setField("location")}
                  aria-invalid={Boolean(errors.location)}
                  aria-describedby={errors.location ? `${formId}-location-error` : undefined}
                />
                {errors.location ? (
                  <p id={`${formId}-location-error`} className={errorTextClass}>
                    {errors.location}
                  </p>
                ) : null}
              </div>

              <div>
                <label htmlFor={`${formId}-size`} className={labelClass}>
                  Size <span className={hintTextClass}>Optional</span>
                </label>
                <div className="flex">
                  <input
                    id={`${formId}-size`}
                    name="sizeValue"
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="0"
                    className={`${inputClass} rounded-r-none`}
                    value={form.sizeValue}
                    onChange={setField("sizeValue")}
                    aria-invalid={Boolean(errors.size)}
                    aria-describedby={errors.size ? `${formId}-size-error` : undefined}
                  />
                  <select
                    name="sizeUnit"
                    aria-label="Size unit"
                    value={form.sizeUnit}
                    onChange={setField("sizeUnit")}
                    className="min-h-11 rounded-r-[10px] border border-l-0 border-border bg-bg px-2 text-base text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <option value="">Unit</option>
                    {SIZE_UNITS.map((sizeUnit) => (
                      <option key={sizeUnit} value={sizeUnit}>
                        {sizeUnit}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.size ? (
                  <p id={`${formId}-size-error`} className={errorTextClass}>
                    {errors.size}
                  </p>
                ) : null}
              </div>
            </div>

            <div>
              <label htmlFor={`${formId}-notes`} className={labelClass}>
                Notes <span className={hintTextClass}>Optional</span>
              </label>
              <textarea
                id={`${formId}-notes`}
                name="notes"
                rows={4}
                placeholder="Anything useful to remember about this plot"
                className={textareaClass}
                value={form.notes}
                onChange={setField("notes")}
                aria-invalid={Boolean(errors.notes)}
                aria-describedby={errors.notes ? `${formId}-notes-error` : undefined}
              />
              {errors.notes ? (
                <p id={`${formId}-notes-error`} className={errorTextClass}>
                  {errors.notes}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <footer className="flex border-t border-border px-5 py-4 min-[768px]:px-7">
          <Button
            type="submit"
            disabled={pending}
            aria-busy={pending}
            className="w-full min-[560px]:ml-auto min-[560px]:w-auto"
          >
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}
