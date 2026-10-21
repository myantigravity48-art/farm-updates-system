export const MISSING_FUNCTION_MESSAGE =
  "The database needs updating. Apply supabase/migrations/0004_farm_functions.sql.";
export const DUPLICATE_FARM_MESSAGE = "A farm with that name already exists.";
export const NETWORK_ERROR_MESSAGE = "Could not reach the database. Try again.";

export interface DatabaseErrorLike {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
}

export interface MappedDatabaseError {
  message: string;
  /** One-based row number from a bulk error, when present. */
  row?: number;
  rowMessage?: string;
}

function isMissingFunction(error: DatabaseErrorLike): boolean {
  const message = error.message ?? "";
  return (
    error.code === "PGRST202" ||
    error.code === "42883" ||
    /could not find the function/i.test(message) ||
    /function .* does not exist/i.test(message)
  );
}

/** Turns a Supabase or Postgres error into copy the user can act on. */
export function mapDatabaseError(
  error: DatabaseErrorLike,
  fallback: string,
): MappedDatabaseError {
  if (isMissingFunction(error)) return { message: MISSING_FUNCTION_MESSAGE };

  const message = error.message ?? "";
  const rowMatch = /^row\s+(\d+):\s*(.*)$/i.exec(message);

  if (rowMatch) {
    const row = Number(rowMatch[1]);
    const detail = rowMatch[2];
    const rowMessage = /a farm with that name already exists/i.test(detail)
      ? DUPLICATE_FARM_MESSAGE
      : detail;
    return {
      message: `Row ${row}: ${rowMessage}`,
      row,
      rowMessage,
    };
  }

  if (error.code === "23505" || /duplicate key|already exists/i.test(message)) {
    return { message: DUPLICATE_FARM_MESSAGE };
  }

  return { message: fallback };
}
