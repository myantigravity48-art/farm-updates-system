import { describe, expect, it } from "vitest";
import { BULK_MAX_ROWS, parseBulkText } from "./parse-bulk";

describe("parseBulkText", () => {
  it("parses tab-separated rows", () => {
    const result = parseBulkText("Farm A\tVillage\t2\thectares\nFarm B\tLGA\t4\tacres");
    expect(result.error).toBeUndefined();
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({
      name: "Farm A",
      location: "Village",
      sizeValue: "2",
      sizeUnit: "hectares",
    });
  });

  it("parses comma-separated rows", () => {
    const result = parseBulkText("Farm A,Village,2,hectares");
    expect(result.rows[0]).toMatchObject({
      name: "Farm A",
      location: "Village",
      sizeValue: "2",
      sizeUnit: "hectares",
    });
  });

  it("skips blank lines and trims trailing spaces", () => {
    const result = parseBulkText("\n  \n Farm A , Village , 2 , hectares \n\n");
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      name: "Farm A",
      location: "Village",
      sizeValue: "2",
      sizeUnit: "hectares",
    });
  });

  it("skips a header row in any case", () => {
    for (const header of ["Name,Location,Size,Unit", "NAME\tLOCATION\tSIZE\tUNIT"]) {
      const result = parseBulkText(`${header}\nFarm A,Village,2,hectares`);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].name).toBe("Farm A");
    }
  });

  it("handles Windows line endings", () => {
    const result = parseBulkText("Farm A,Village,2,hectares\r\nFarm B,,,\r\n");
    expect(result.rows).toHaveLength(2);
    expect(result.rows[1].name).toBe("Farm B");
  });

  it("flags duplicate names in the paste, ignoring case", () => {
    const result = parseBulkText("Farm A,,,\nfarm a,,,\nFarm B,,,");
    expect(result.rows[0].errors.name).toBe(
      "This name appears more than once in the pasted rows.",
    );
    expect(result.rows[1].errors.name).toBe(
      "This name appears more than once in the pasted rows.",
    );
    expect(result.rows[2].errors.name).toBeUndefined();
  });

  it("reports a size without a unit", () => {
    const result = parseBulkText("Farm A,Village,2,");
    expect(result.rows[0].errors.size).toBe(
      "Choose a unit for the size, or clear the size.",
    );
  });

  it("reports a missing name", () => {
    const result = parseBulkText(",Village,,hectares");
    expect(result.rows[0].errors.name).toBe("Enter a farm name.");
  });

  it("rejects more than 100 rows", () => {
    const text = Array.from({ length: BULK_MAX_ROWS + 1 }, (_, index) => `Farm ${index + 1}`).join(
      "\n",
    );
    const result = parseBulkText(text);
    expect(result.rows).toHaveLength(0);
    expect(result.error).toBe("Paste 100 rows or fewer.");
  });

  it("accepts exactly 100 rows", () => {
    const text = Array.from({ length: BULK_MAX_ROWS }, (_, index) => `Farm ${index + 1}`).join(
      "\n",
    );
    const result = parseBulkText(text);
    expect(result.error).toBeUndefined();
    expect(result.rows).toHaveLength(BULK_MAX_ROWS);
  });
});
