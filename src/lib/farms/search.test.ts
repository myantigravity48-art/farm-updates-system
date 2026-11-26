import { describe, expect, it } from "vitest";
import { farmMatchesSearch, filterFarms, normalizeFarmSearch } from "./search";

const farms = [
  { name: "Obaoba", location: "Ogun" },
  { name: "Uzor Timber", location: "Enugu" },
  { name: "Café Plot", location: null },
];

describe("normalizeFarmSearch", () => {
  it("lowercases and removes accents", () => {
    expect(normalizeFarmSearch("  OBAÒBÁ  ")).toBe("obaoba");
  });
});

describe("farmMatchesSearch", () => {
  it("matches case-insensitively", () => {
    expect(farmMatchesSearch("Uzor Timber", "uzor")).toBe(true);
    expect(farmMatchesSearch("Uzor Timber", "UZOR")).toBe(true);
  });

  it("matches accent-insensitively in both directions", () => {
    expect(farmMatchesSearch("Obaòbá", "obaoba")).toBe(true);
    expect(farmMatchesSearch("Obaoba", "obaòbá")).toBe(true);
    expect(farmMatchesSearch("Café Plot", "cafe")).toBe(true);
  });

  it("treats a blank query as a match", () => {
    expect(farmMatchesSearch("Obaoba", "")).toBe(true);
    expect(farmMatchesSearch("Obaoba", "   ")).toBe(true);
  });
});

describe("filterFarms", () => {
  it("filters by the text the caller supplies", () => {
    expect(filterFarms(farms, "oba", (farm) => farm.name)).toEqual([farms[0]]);
  });

  it("can include location in the searched text", () => {
    expect(filterFarms(farms, "enugu", (farm) => `${farm.name} ${farm.location ?? ""}`)).toEqual([
      farms[1],
    ]);
  });

  it("does not match location when the caller only supplies the name", () => {
    expect(filterFarms(farms, "enugu", (farm) => farm.name)).toEqual([]);
  });

  it("returns every farm for a blank query", () => {
    expect(filterFarms(farms, "  ", (farm) => farm.name)).toEqual(farms);
  });
});
