"use client";

import { ArrowLeft, Leaf, Plus, Trash2 } from "lucide-react";
import { useActionState, useEffect, useId, useRef, useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  errorTextClass,
  hintTextClass,
  inputClass,
  labelClass,
  textareaClass,
} from "@/components/ui/form-styles";
import { Modal } from "@/components/ui/modal";
import { ErrorSummary } from "@/components/farms/error-summary";
import type { StageConfig } from "@/lib/data/types";
import { addFarm, addFarmsBulk } from "@/lib/farms/actions";
import { initialFarmFormState, type FarmFormState } from "@/lib/farms/form-state";
import { parseBulkText } from "@/lib/farms/parse-bulk";
import { SIZE_UNITS } from "@/lib/farms/validate";

type Mode = "single" | "bulk";

interface EditableRow {
  id: string;
  name: string;
  location: string;
  sizeValue: string;
  sizeUnit: string;
  errors: { name?: string; location?: string; size?: string };
}

function blankRow(id: string): EditableRow {
  return { id, name: "", location: "", sizeValue: "", sizeUnit: "", errors: {} };
}

function isBlankRow(row: EditableRow): boolean {
  return !row.name.trim() && !row.location.trim() && !row.sizeValue.trim() && !row.sizeUnit;
}

export function FarmDialog({
  open,
  initialMode = "single",
  onClose,
  onAdded,
  stageConfig,
}: {
  open: boolean;
  initialMode?: Mode;
  onClose: () => void;
  onAdded: (message: string) => void;
  stageConfig: StageConfig;
}) {
  if (!open) return null;

  return (
    <FarmDialogContent
      initialMode={initialMode}
      onClose={onClose}
      onAdded={onAdded}
      stageConfig={stageConfig}
    />
  );
}

function FarmDialogContent({
  initialMode,
  onClose,
  onAdded,
  stageConfig,
}: {
  initialMode: Mode;
  onClose: () => void;
  onAdded: (message: string) => void;
  stageConfig: StageConfig;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const titleId = useId();
  const [singleState, singleAction, singlePending] = useActionState(
    addFarm,
    initialFarmFormState,
  );
  const [bulkState, bulkAction, bulkPending] = useActionState(
    addFarmsBulk,
    initialFarmFormState,
  );
  const notified = useRef(false);
  const onAddedRef = useRef(onAdded);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onAddedRef.current = onAdded;
    onCloseRef.current = onClose;
  }, [onAdded, onClose]);

  useEffect(() => {
    const result: FarmFormState = mode === "single" ? singleState : bulkState;
    if (result.status !== "success" || notified.current) return;
    notified.current = true;
    onAddedRef.current(result.message ?? (mode === "single" ? "Farm added" : "Farms added"));
    onCloseRef.current();
  }, [mode, singleState, bulkState]);

  const isBulk = mode === "bulk";

  return (
    <Modal onClose={onClose} labelledBy={titleId}>
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
              {isBulk ? "Add several farms" : "Add a farm"}
            </h2>
            <p className="mt-2 text-sm text-muted">
              {isBulk
                ? "Add plot records together, or paste rows copied from a spreadsheet."
                : "Start a field record. You can add more details as the season moves on."}
            </p>
          </div>
        </div>
      </header>

      {isBulk ? (
        <BulkAddForm
          state={bulkState}
          action={bulkAction}
          pending={bulkPending}
          onSwitch={() => setMode("single")}
        />
      ) : (
        <AddFarmForm
          state={singleState}
          action={singleAction}
          pending={singlePending}
          onSwitch={() => setMode("bulk")}
          stageConfig={stageConfig}
        />
      )}
    </Modal>
  );
}

function AddFarmForm({
  state,
  action,
  pending,
  onSwitch,
  stageConfig,
}: {
  state: FarmFormState;
  action: (formData: FormData) => void;
  pending: boolean;
  onSwitch: () => void;
  stageConfig: StageConfig;
}) {
  const id = useId();
  const firstPosition = stageConfig.stages[0]?.position ?? 1;
  const [form, setForm] = useState({
    name: "",
    location: "",
    sizeValue: "",
    sizeUnit: "",
    currentPosition: String(firstPosition),
    plantingDate: "",
    notes: "",
  });
  const errors = state.fieldErrors ?? {};
  const plantingRequired = Number(form.currentPosition) > stageConfig.plantingPosition;
  const fieldsUnavailable = stageConfig.stages.length === 0;

  const setField =
    (field: keyof typeof form) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((current) => ({ ...current, [field]: event.target.value }));

  return (
    <form action={action} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 min-[768px]:px-7">
        <ErrorSummary message={state.status === "error" ? state.message : undefined} errors={errors} />

        {fieldsUnavailable ? (
          <p role="alert" className="text-sm text-overdue">
            Stages could not be loaded. Refresh the page.
          </p>
        ) : null}

        <div className="space-y-5">
          <div>
            <label htmlFor={`${id}-name`} className={labelClass}>
              Farm name <span className={hintTextClass}>Required</span>
            </label>
            <input
              id={`${id}-name`}
              name="name"
              type="text"
              autoComplete="off"
              placeholder="e.g. Obi-Umuagbogho"
              className={inputClass}
              data-autofocus
              value={form.name}
              onChange={setField("name")}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? `${id}-name-error` : undefined}
            />
            {errors.name ? (
              <p id={`${id}-name-error`} className={errorTextClass}>
                {errors.name}
              </p>
            ) : null}
          </div>

          <div className="grid gap-5 min-[560px]:grid-cols-2">
            <div>
              <label htmlFor={`${id}-location`} className={labelClass}>
                Location <span className={hintTextClass}>Optional</span>
              </label>
              <input
                id={`${id}-location`}
                name="location"
                type="text"
                autoComplete="off"
                placeholder="Village, LGA or state"
                className={inputClass}
                value={form.location}
                onChange={setField("location")}
                aria-invalid={Boolean(errors.location)}
                aria-describedby={errors.location ? `${id}-location-error` : undefined}
              />
              {errors.location ? (
                <p id={`${id}-location-error`} className={errorTextClass}>
                  {errors.location}
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor={`${id}-size`} className={labelClass}>
                Size <span className={hintTextClass}>Optional</span>
              </label>
              <div className="flex">
                <input
                  id={`${id}-size`}
                  name="sizeValue"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0"
                  className={`${inputClass} rounded-r-none`}
                  value={form.sizeValue}
                  onChange={setField("sizeValue")}
                  aria-invalid={Boolean(errors.size)}
                  aria-describedby={errors.size ? `${id}-size-error` : undefined}
                />
                <select
                  name="sizeUnit"
                  aria-label="Size unit"
                  className="min-h-11 rounded-r-[10px] border border-l-0 border-border bg-bg px-2 text-base text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  value={form.sizeUnit}
                  onChange={setField("sizeUnit")}
                >
                  <option value="">Unit</option>
                  {SIZE_UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>
              {errors.size ? (
                <p id={`${id}-size-error`} className={errorTextClass}>
                  {errors.size}
                </p>
              ) : null}
            </div>
          </div>

          <div>
            <label htmlFor={`${id}-position`} className={labelClass}>
              Where is it in the process?
            </label>
            <select
              id={`${id}-position`}
              name="currentPosition"
              className={inputClass}
              value={form.currentPosition}
              onChange={setField("currentPosition")}
              aria-invalid={Boolean(errors.currentPosition)}
              aria-describedby={errors.currentPosition ? `${id}-position-error` : undefined}
            >
              {stageConfig.stages.map((stage) => (
                <option key={stage.position} value={stage.position}>
                  {stage.position === firstPosition ? "Not started, land acquired" : stage.name}
                </option>
              ))}
            </select>
            {errors.currentPosition ? (
              <p id={`${id}-position-error`} className={errorTextClass}>
                {errors.currentPosition}
              </p>
            ) : null}
          </div>

          {plantingRequired ? (
            <div>
              <label htmlFor={`${id}-planting`} className={labelClass}>
                Planting date <span className={hintTextClass}>Required</span>
              </label>
              <input
                id={`${id}-planting`}
                name="plantingDate"
                type="date"
                className={inputClass}
                value={form.plantingDate}
                onChange={setField("plantingDate")}
                aria-invalid={Boolean(errors.plantingDate)}
                aria-describedby={errors.plantingDate ? `${id}-planting-error` : undefined}
              />
              <p className="mt-2 text-sm text-muted">
                The chosen stage comes after planting, so the schedule needs this date.
              </p>
              {errors.plantingDate ? (
                <p id={`${id}-planting-error`} className={errorTextClass}>
                  {errors.plantingDate}
                </p>
              ) : null}
            </div>
          ) : null}

          <div>
            <label htmlFor={`${id}-notes`} className={labelClass}>
              Notes <span className={hintTextClass}>Optional</span>
            </label>
            <textarea
              id={`${id}-notes`}
              name="notes"
              rows={3}
              placeholder="Anything useful to remember about this plot"
              className={textareaClass}
              value={form.notes}
              onChange={setField("notes")}
              aria-invalid={Boolean(errors.notes)}
              aria-describedby={errors.notes ? `${id}-notes-error` : undefined}
            />
            {errors.notes ? (
              <p id={`${id}-notes-error`} className={errorTextClass}>
                {errors.notes}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <footer className="border-t border-border px-5 py-4 min-[768px]:px-7">
        <Button
          type="submit"
          disabled={pending || fieldsUnavailable}
          aria-busy={pending}
          className="w-full"
        >
          {pending ? "Adding farm…" : "Add farm"}
        </Button>
        <button
          type="button"
          onClick={onSwitch}
          className="mt-2 min-h-11 w-full text-sm text-primary hover:underline"
        >
          Add several farms at once
        </button>
      </footer>
    </form>
  );
}

function BulkAddForm({
  state,
  action,
  pending,
  onSwitch,
}: {
  state: FarmFormState;
  action: (formData: FormData) => void;
  pending: boolean;
  onSwitch: () => void;
}) {
  const id = useId();
  const nextRow = useRef(2);
  const [rows, setRows] = useState<EditableRow[]>([blankRow("row-1")]);
  const [paste, setPaste] = useState("");
  const [pasteError, setPasteError] = useState<string | undefined>();

  const makeId = () => {
    const value = `row-${nextRow.current}`;
    nextRow.current += 1;
    return value;
  };

  const updateRow = (rowId: string, patch: Partial<EditableRow>) => {
    setRows((current) =>
      current.map((row) =>
        row.id === rowId ? { ...row, ...patch, errors: { ...row.errors, ...(patch.errors ?? {}) } } : row,
      ),
    );
  };

  const clearRowError = (row: EditableRow, key: "name" | "location" | "size") => {
    if (!row.errors[key]) return row;
    const errors = { ...row.errors };
    delete errors[key];
    return { ...row, errors };
  };

  const addRow = () => {
    setRows((current) => [...current, blankRow(makeId())]);
  };

  const removeRow = (rowId: string) => {
    setRows((current) => current.filter((row) => row.id !== rowId));
  };

  const applyPaste = () => {
    const parsed = parseBulkText(paste);
    if (parsed.error) {
      setPasteError(parsed.error);
      return;
    }

    if (parsed.rows.length === 0) {
      setPasteError("No rows found. Paste rows with name, location, size and unit.");
      return;
    }

    setPasteError(undefined);
    setRows((current) => {
      const pasted = parsed.rows.map((row): EditableRow => ({
        id: makeId(),
        name: row.name,
        location: row.location,
        sizeValue: row.sizeValue,
        sizeUnit: row.sizeUnit,
        errors: row.errors,
      }));

      if (current.length === 1 && isBlankRow(current[0])) return pasted;
      return [...current, ...pasted];
    });
  };

  const payload = JSON.stringify(
    rows.map((row) => ({
      name: row.name,
      location: row.location,
      sizeValue: row.sizeValue,
      sizeUnit: row.sizeUnit,
    })),
  );

  return (
    <form action={action} className="flex min-h-0 flex-1 flex-col">
      <input type="hidden" name="rows" value={payload} />
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 min-[768px]:px-7">
        {state.status === "error" && state.message ? (
          <div role="alert" className="mb-5 rounded-[10px] border border-overdue p-4 text-sm">
            {state.message}
          </div>
        ) : null}

        <section className="rounded-[10px] border border-border bg-raised p-4">
          <label htmlFor={`${id}-paste`} className={labelClass}>
            Paste from spreadsheet
          </label>
          <p className="mb-3 text-sm text-muted">
            Copy columns in this order: name, location, size, unit.
          </p>
          <textarea
            id={`${id}-paste`}
            rows={3}
            value={paste}
            onChange={(event) => setPaste(event.target.value)}
            placeholder={"Farm name\tLocation\tSize\tUnit"}
            className={textareaClass}
          />
          <div className="mt-3">
            <Button variant="secondary" onClick={applyPaste}>
              Add pasted rows
            </Button>
          </div>
          {pasteError ? (
            <p role="alert" className={errorTextClass}>
              {pasteError}
            </p>
          ) : null}
        </section>

        <section className="mt-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-medium">Farm details</h3>
            <p className="text-sm text-muted tabular-nums">
              {rows.length} {rows.length === 1 ? "row" : "rows"}
            </p>
          </div>
          <p className={`mt-1 ${hintTextClass} min-[640px]:hidden`}>Swipe to see size</p>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-sm">
              <caption className="sr-only">Farm rows</caption>
              <thead>
                <tr className="text-left text-muted">
                  <th scope="col" className="pb-2 pr-2 font-medium">
                    Name <span aria-hidden="true">*</span>
                  </th>
                  <th scope="col" className="pb-2 pr-2 font-medium">
                    Location
                  </th>
                  <th scope="col" className="pb-2 pr-2 font-medium">
                    Size
                  </th>
                  <th scope="col" className="pb-2 pr-2 font-medium">
                    Unit
                  </th>
                  <th scope="col" className="pb-2 font-medium">
                    <span className="sr-only">Remove</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const rowError =
                    state.rowErrors?.[index] ??
                    row.errors.name ??
                    row.errors.location ??
                    row.errors.size;
                  const rowErrorId = `${id}-row-${row.id}-error`;

                  return (
                    <tr key={row.id} className="align-top">
                      <td className="py-1 pr-2">
                        <input
                          type="text"
                          value={row.name}
                          onChange={(event) =>
                            updateRow(row.id, {
                              name: event.target.value,
                              errors: clearRowError(row, "name").errors,
                            })
                          }
                          aria-label={`Farm name, row ${index + 1}`}
                          aria-invalid={Boolean(rowError)}
                          aria-describedby={rowError ? rowErrorId : undefined}
                          placeholder="Farm name"
                          className={inputClass}
                        />
                        {rowError ? (
                          <p id={rowErrorId} className={errorTextClass}>
                            {rowError}
                          </p>
                        ) : null}
                      </td>
                      <td className="py-1 pr-2">
                        <input
                          type="text"
                          value={row.location}
                          onChange={(event) =>
                            updateRow(row.id, {
                              location: event.target.value,
                              errors: clearRowError(row, "location").errors,
                            })
                          }
                          aria-label={`Location, row ${index + 1}`}
                          placeholder="Location"
                          className={inputClass}
                        />
                      </td>
                      <td className="py-1 pr-2">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={row.sizeValue}
                          onChange={(event) =>
                            updateRow(row.id, {
                              sizeValue: event.target.value,
                              errors: clearRowError(row, "size").errors,
                            })
                          }
                          aria-label={`Size, row ${index + 1}`}
                          placeholder="0"
                          className={inputClass}
                        />
                      </td>
                      <td className="py-1 pr-2">
                        <select
                          value={row.sizeUnit}
                          onChange={(event) =>
                            updateRow(row.id, {
                              sizeUnit: event.target.value,
                              errors: clearRowError(row, "size").errors,
                            })
                          }
                          aria-label={`Size unit, row ${index + 1}`}
                          className={inputClass}
                        >
                          <option value="">Unit</option>
                          {SIZE_UNITS.map((unit) => (
                            <option key={unit} value={unit}>
                              {unit}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-1">
                        <button
                          type="button"
                          onClick={() => removeRow(row.id)}
                          aria-label={`Remove row ${index + 1}`}
                          className="flex h-11 w-11 items-center justify-center rounded-[10px] text-muted hover:bg-raised hover:text-text"
                        >
                          <Trash2 aria-hidden="true" size={18} strokeWidth={1.5} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={addRow}
            className="mt-3 flex min-h-11 items-center gap-2 rounded-[10px] px-2 text-sm text-primary hover:bg-raised"
          >
            <Plus aria-hidden="true" size={18} strokeWidth={1.5} />
            Add row
          </button>
        </section>
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-border px-5 py-4 min-[768px]:px-7">
        <button
          type="button"
          onClick={onSwitch}
          className="flex min-h-11 items-center gap-2 rounded-[10px] px-2 text-sm text-primary hover:bg-raised"
        >
          <ArrowLeft aria-hidden="true" size={18} strokeWidth={1.5} />
          One farm
        </button>
        <Button type="submit" disabled={pending || rows.length === 0} aria-busy={pending}>
          {pending ? "Adding farms…" : "Add farms"}
        </Button>
      </footer>
    </form>
  );
}
