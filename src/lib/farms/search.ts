/**
 * One matcher for both farm searches: the farm rail and the /farms page.
 * Matching is case-insensitive and accent-insensitive, and a blank query
 * matches everything.
 */
export function normalizeFarmSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function farmMatchesSearch(text: string, query: string): boolean {
  const needle = normalizeFarmSearch(query);
  return needle.length === 0 || normalizeFarmSearch(text).includes(needle);
}

export function filterFarms<T>(
  farms: readonly T[],
  query: string,
  getText: (farm: T) => string,
): T[] {
  const needle = normalizeFarmSearch(query);
  if (!needle) return farms.slice();
  return farms.filter((farm) => normalizeFarmSearch(getText(farm)).includes(needle));
}
