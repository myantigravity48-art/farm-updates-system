import { validateLocation, validateName, validateSize } from "./validate";

export const BULK_MAX_ROWS = 100;

export interface BulkRow {
  name: string;
  location: string;
  sizeValue: string;
  sizeUnit: string;
  errors: {
    name?: string;
    location?: string;
    size?: string;
  };
}

export interface BulkParseResult {
  rows: BulkRow[];
  error?: string;
}

interface RawRow {
  name: string;
  location: string;
  sizeValue: string;
  sizeUnit: string;
}

function splitLine(line: string): string[] {
  return line.includes("\t") ? line.split("\t") : line.split(",");
}

/** Parses spreadsheet text with name, location, size and unit columns. */
export function parseBulkText(text: string): BulkParseResult {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const rawRows: RawRow[] = [];
  let seenContent = false;

  for (const line of lines) {
    if (!line.trim()) continue;

    const cells = splitLine(line).map((cell) => cell.trim());

    if (!seenContent) {
      seenContent = true;
      if ((cells[0] ?? "").toLowerCase() === "name") continue;
    }

    rawRows.push({
      name: cells[0] ?? "",
      location: cells[1] ?? "",
      sizeValue: cells[2] ?? "",
      sizeUnit: cells[3] ?? "",
    });
  }

  if (rawRows.length > BULK_MAX_ROWS) {
    return { rows: [], error: `Paste ${BULK_MAX_ROWS} rows or fewer.` };
  }

  const nameCounts = new Map<string, number>();
  for (const row of rawRows) {
    const key = row.name.trim().toLowerCase();
    if (!key) continue;
    nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1);
  }

  const rows = rawRows.map((row): BulkRow => {
    const errors: BulkRow["errors"] = {};
    const key = row.name.trim().toLowerCase();
    const nameError = validateName(row.name);

    if (nameError) {
      errors.name = nameError;
    } else if (key && (nameCounts.get(key) ?? 0) > 1) {
      errors.name = "This name appears more than once in the pasted rows.";
    }

    const locationError = validateLocation(row.location);
    if (locationError) errors.location = locationError;

    const size = validateSize(row.sizeValue, row.sizeUnit);
    if (size.error) errors.size = size.error;

    return {
      name: row.name,
      location: row.location,
      sizeValue: row.sizeValue,
      sizeUnit: row.sizeUnit,
      errors,
    };
  });

  return { rows };
}
