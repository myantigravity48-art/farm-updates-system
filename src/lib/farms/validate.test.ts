import { describe, expect, it } from "vitest";
import type { CalendarDate } from "@/lib/schedule";
import {
  validateBulkFarm,
  validateFarmDetails,
  validateNewFarm,
  type NewFarmContext,
} from "./validate";

const today = "2026-10-21" as CalendarDate;
const context: NewFarmContext = {
  today,
  positions: [1, 2, 3, 4, 5, 6, 7, 8],
  plantingPosition: 2,
};

const details = {
  name: "Obi-Umuagbogho",
  location: "",
  sizeValue: "",
  sizeUnit: "",
  notes: "",
};

describe("farm details", () => {
  it("accepts a farm with only a name", () => {
    const result = validateFarmDetails(details);
    expect(result.ok).toBe(true);
    expect(result.values).toEqual({
      name: "Obi-Umuagbogho",
      location: null,
      sizeValue: null,
      sizeUnit: null,
      notes: null,
    });
  });

  it("requires a name", () => {
    const result = validateFarmDetails({ ...details, name: "   " });
    expect(result.ok).toBe(false);
    expect(result.errors.name).toBe("Enter a farm name.");
  });

  it("limits the name to 80 characters", () => {
    expect(validateFarmDetails({ ...details, name: "a".repeat(80) }).ok).toBe(true);
    const result = validateFarmDetails({ ...details, name: "a".repeat(81) });
    expect(result.errors.name).toBe("Keep the farm name to 80 characters or fewer.");
  });

  it("trims the name and optional fields", () => {
    const result = validateFarmDetails({
      ...details,
      name: "  Farm A  ",
      location: "  Village  ",
      notes: "  Remember the gate code  ",
    });
    expect(result.values?.name).toBe("Farm A");
    expect(result.values?.location).toBe("Village");
    expect(result.values?.notes).toBe("Remember the gate code");
  });

  it("limits the location to 120 characters", () => {
    expect(validateFarmDetails({ ...details, location: "a".repeat(120) }).ok).toBe(true);
    const result = validateFarmDetails({ ...details, location: "a".repeat(121) });
    expect(result.errors.location).toBe("Keep the location to 120 characters or fewer.");
  });

  it("limits notes to 1000 characters", () => {
    expect(validateFarmDetails({ ...details, notes: "a".repeat(1000) }).ok).toBe(true);
    const result = validateFarmDetails({ ...details, notes: "a".repeat(1001) });
    expect(result.errors.notes).toBe("Keep the notes to 1000 characters or fewer.");
  });
});

describe("size and unit", () => {
  it("accepts every allowed unit", () => {
    for (const unit of ["hectares", "acres", "plots", "sq m"]) {
      const result = validateFarmDetails({ ...details, sizeValue: "2", sizeUnit: unit });
      expect(result.ok).toBe(true);
      expect(result.values?.sizeValue).toBe(2);
      expect(result.values?.sizeUnit).toBe(unit);
    }
  });

  it("rejects a size without a unit", () => {
    const result = validateFarmDetails({ ...details, sizeValue: "2" });
    expect(result.errors.size).toBe("Choose a unit for the size, or clear the size.");
  });

  it("rejects a unit without a size", () => {
    const result = validateFarmDetails({ ...details, sizeUnit: "hectares" });
    expect(result.errors.size).toBe("Add a size, or clear the unit.");
  });

  it("rejects an unknown unit", () => {
    const result = validateFarmDetails({ ...details, sizeValue: "2", sizeUnit: "kg" });
    expect(result.errors.size).toBe("Choose a unit from: hectares, acres, plots or sq m.");
  });

  it("rejects zero and negative sizes", () => {
    for (const value of ["0", "-2"]) {
      const result = validateFarmDetails({ ...details, sizeValue: value, sizeUnit: "acres" });
      expect(result.errors.size).toBe("Enter a size greater than zero.");
    }
  });

  it("rejects a size that is not a number", () => {
    const result = validateFarmDetails({ ...details, sizeValue: "two", sizeUnit: "plots" });
    expect(result.errors.size).toBe("Enter a size greater than zero.");
  });
});

describe("new farm stage and planting date", () => {
  const base = { ...details, currentPosition: "1", plantingDate: "" };

  it("accepts a farm that has not started", () => {
    const result = validateNewFarm(base, context);
    expect(result.ok).toBe(true);
    expect(result.values?.currentPosition).toBe(1);
    expect(result.values?.plantingDate).toBeNull();
  });

  it("requires a planting date after the planting stage", () => {
    const result = validateNewFarm({ ...base, currentPosition: "3" }, context);
    expect(result.errors.plantingDate).toBe("Choose the planting date.");
  });

  it("accepts a past planting date after the planting stage", () => {
    const result = validateNewFarm(
      { ...base, currentPosition: "3", plantingDate: "2026-05-01" },
      context,
    );
    expect(result.ok).toBe(true);
    expect(result.values?.plantingDate).toBe("2026-05-01");
  });

  it("rejects a future planting date", () => {
    const result = validateNewFarm(
      { ...base, currentPosition: "3", plantingDate: "2026-10-22" },
      context,
    );
    expect(result.errors.plantingDate).toBe("Planting date cannot be in the future.");
  });

  it("rejects an invalid planting date", () => {
    const result = validateNewFarm(
      { ...base, currentPosition: "3", plantingDate: "2026-02-31" },
      context,
    );
    expect(result.errors.plantingDate).toBe("Enter a valid planting date.");
  });

  it("ignores the planting date when the farm is not past planting", () => {
    const result = validateNewFarm(
      { ...base, currentPosition: "2", plantingDate: "2026-12-31" },
      context,
    );
    expect(result.ok).toBe(true);
    expect(result.values?.plantingDate).toBeNull();
  });

  it("rejects a stage outside the list", () => {
    for (const position of ["", "0", "9", "1.5"]) {
      const result = validateNewFarm({ ...base, currentPosition: position }, context);
      expect(result.errors.currentPosition).toBe(
        "Choose where the farm is in the process.",
      );
    }
  });

  it("keeps the details errors alongside the stage errors", () => {
    const result = validateNewFarm(
      { ...base, name: "", currentPosition: "9" },
      context,
    );
    expect(result.errors.name).toBe("Enter a farm name.");
    expect(result.errors.currentPosition).toBe(
      "Choose where the farm is in the process.",
    );
  });
});

describe("bulk farm rows", () => {
  it("accepts a name, location, size and unit", () => {
    const result = validateBulkFarm({
      name: " Farm A ",
      location: " Village ",
      sizeValue: "2.5",
      sizeUnit: "hectares",
    });
    expect(result.ok).toBe(true);
    expect(result.values).toEqual({
      name: "Farm A",
      location: "Village",
      sizeValue: 2.5,
      sizeUnit: "hectares",
    });
  });

  it("reports the first problem on the row", () => {
    const result = validateBulkFarm({
      name: "",
      location: "",
      sizeValue: "2",
      sizeUnit: "",
    });
    expect(result.errors.name).toBe("Enter a farm name.");
    expect(result.errors.size).toBe("Choose a unit for the size, or clear the size.");
  });
});
