import { compare, parse, type CalendarDate } from "@/lib/schedule";

export const FARM_NAME_MAX = 80;
export const FARM_LOCATION_MAX = 120;
export const FARM_NOTES_MAX = 1000;

export const SIZE_UNITS = ["hectares", "acres", "plots", "sq m"] as const;
export type SizeUnit = (typeof SIZE_UNITS)[number];

export interface FarmDetailsInput {
  name: string;
  location: string;
  sizeValue: string;
  sizeUnit: string;
  notes: string;
}

export interface NewFarmInput extends FarmDetailsInput {
  currentPosition: string;
  plantingDate: string;
}

export interface BulkFarmInput {
  name: string;
  location: string;
  sizeValue: string;
  sizeUnit: string;
}

export interface FarmFieldErrors {
  name?: string;
  location?: string;
  size?: string;
  notes?: string;
  currentPosition?: string;
  plantingDate?: string;
}

export interface FarmDetailsValues {
  name: string;
  location: string | null;
  sizeValue: number | null;
  sizeUnit: SizeUnit | null;
  notes: string | null;
}

export interface NewFarmValues extends FarmDetailsValues {
  currentPosition: number;
  plantingDate: CalendarDate | null;
}

export interface BulkFarmValues {
  name: string;
  location: string | null;
  sizeValue: number | null;
  sizeUnit: SizeUnit | null;
}

export interface NewFarmContext {
  today: CalendarDate;
  /** Every stage position the form is allowed to choose. */
  positions: number[];
  /** The position of the stage whose window_key is "planting". */
  plantingPosition: number;
}

export interface ValidationResult<T> {
  ok: boolean;
  errors: FarmFieldErrors;
  values: T | null;
}

export function isSizeUnit(value: string): value is SizeUnit {
  return (SIZE_UNITS as readonly string[]).includes(value);
}

/** Parses an ISO calendar date and returns null when it is not a real date. */
export function parseCalendarDate(value: string): CalendarDate | null {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  try {
    parse(trimmed as CalendarDate);
    return trimmed as CalendarDate;
  } catch {
    return null;
  }
}

export function validateName(value: string): string | undefined {
  const name = value.trim();
  if (!name) return "Enter a farm name.";
  if (name.length > FARM_NAME_MAX) return `Keep the farm name to ${FARM_NAME_MAX} characters or fewer.`;
  return undefined;
}

export function validateLocation(value: string): string | undefined {
  if (value.trim().length > FARM_LOCATION_MAX) {
    return `Keep the location to ${FARM_LOCATION_MAX} characters or fewer.`;
  }
  return undefined;
}

export function validateNotes(value: string): string | undefined {
  if (value.trim().length > FARM_NOTES_MAX) {
    return `Keep the notes to ${FARM_NOTES_MAX} characters or fewer.`;
  }
  return undefined;
}

export function validateSize(
  sizeValue: string,
  sizeUnit: string,
): { error?: string; value: number | null; unit: SizeUnit | null } {
  const rawValue = sizeValue.trim();
  const rawUnit = sizeUnit.trim();

  if (!rawValue && !rawUnit) return { value: null, unit: null };

  if (!rawValue) {
    return { error: "Add a size, or clear the unit.", value: null, unit: null };
  }

  if (!rawUnit) {
    return { error: "Choose a unit for the size, or clear the size.", value: null, unit: null };
  }

  const value = Number(rawValue);
  if (!Number.isFinite(value) || value <= 0) {
    return { error: "Enter a size greater than zero.", value: null, unit: null };
  }

  if (!isSizeUnit(rawUnit)) {
    return { error: "Choose a unit from: hectares, acres, plots or sq m.", value: null, unit: null };
  }

  return { value, unit: rawUnit };
}

export function validateFarmDetails(input: FarmDetailsInput): ValidationResult<FarmDetailsValues> {
  const errors: FarmFieldErrors = {};

  const nameError = validateName(input.name);
  if (nameError) errors.name = nameError;

  const locationError = validateLocation(input.location);
  if (locationError) errors.location = locationError;

  const size = validateSize(input.sizeValue, input.sizeUnit);
  if (size.error) errors.size = size.error;

  const notesError = validateNotes(input.notes);
  if (notesError) errors.notes = notesError;

  if (Object.keys(errors).length > 0) return { ok: false, errors, values: null };

  return {
    ok: true,
    errors,
    values: {
      name: input.name.trim(),
      location: input.location.trim() || null,
      sizeValue: size.value,
      sizeUnit: size.unit,
      notes: input.notes.trim() || null,
    },
  };
}

export function validateBulkFarm(input: BulkFarmInput): ValidationResult<BulkFarmValues> {
  const details = validateFarmDetails({
    name: input.name,
    location: input.location,
    sizeValue: input.sizeValue,
    sizeUnit: input.sizeUnit,
    notes: "",
  });

  if (!details.ok || !details.values) return { ok: false, errors: details.errors, values: null };

  return {
    ok: true,
    errors: {},
    values: {
      name: details.values.name,
      location: details.values.location,
      sizeValue: details.values.sizeValue,
      sizeUnit: details.values.sizeUnit,
    },
  };
}

export function validateNewFarm(input: NewFarmInput, context: NewFarmContext): ValidationResult<NewFarmValues> {
  const details = validateFarmDetails(input);
  const errors: FarmFieldErrors = { ...details.errors };

  const position = Number(input.currentPosition.trim());
  const validPosition =
    input.currentPosition.trim() !== "" &&
    Number.isInteger(position) &&
    context.positions.includes(position);

  if (!validPosition) {
    errors.currentPosition = "Choose where the farm is in the process.";
  }

  let plantingDate: CalendarDate | null = null;

  if (validPosition && position > context.plantingPosition) {
    const rawDate = input.plantingDate.trim();
    const parsedDate = parseCalendarDate(rawDate);

    if (!rawDate) {
      errors.plantingDate = "Choose the planting date.";
    } else if (!parsedDate) {
      errors.plantingDate = "Enter a valid planting date.";
    } else if (compare(parsedDate, context.today) > 0) {
      errors.plantingDate = "Planting date cannot be in the future.";
    } else {
      plantingDate = parsedDate;
    }
  }

  if (Object.keys(errors).length > 0 || !details.values) {
    return { ok: false, errors, values: null };
  }

  return {
    ok: true,
    errors,
    values: {
      ...details.values,
      currentPosition: position,
      plantingDate,
    },
  };
}
