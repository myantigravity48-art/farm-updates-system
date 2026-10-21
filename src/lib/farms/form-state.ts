import type { FarmFieldErrors } from "./validate";

export type FarmFormStatus = "idle" | "error" | "success";

export interface FarmFormState {
  status: FarmFormStatus;
  message?: string;
  fieldErrors?: FarmFieldErrors;
  /** Bulk row errors, keyed by zero-based row index. */
  rowErrors?: Record<number, string>;
}

export const initialFarmFormState: FarmFormState = { status: "idle" };
