import { describe, expect, it } from "vitest";
import {
  DUPLICATE_FARM_MESSAGE,
  mapDatabaseError,
  MISSING_FUNCTION_MESSAGE,
} from "./errors";

const fallback = "Could not add the farm. Try again.";

describe("mapDatabaseError", () => {
  it("maps a unique violation", () => {
    expect(mapDatabaseError({ code: "23505", message: "duplicate key value" }, fallback)).toEqual({
      message: DUPLICATE_FARM_MESSAGE,
    });
  });

  it("maps a missing migration", () => {
    expect(
      mapDatabaseError(
        { code: "PGRST202", message: "Could not find the function public.create_farm" },
        fallback,
      ),
    ).toEqual({ message: MISSING_FUNCTION_MESSAGE });
  });

  it("maps a bulk row duplicate", () => {
    expect(
      mapDatabaseError(
        { code: "23505", message: "row 3: a farm with that name already exists" },
        fallback,
      ),
    ).toEqual({
      message: `Row 3: ${DUPLICATE_FARM_MESSAGE}`,
      row: 3,
      rowMessage: DUPLICATE_FARM_MESSAGE,
    });
  });

  it("falls back to a readable message", () => {
    expect(mapDatabaseError({ message: "something internal" }, fallback)).toEqual({
      message: fallback,
    });
  });
});
