/** Default label for a raw LINQ field token (title-ish case). */
export function humanizePlayerLinqField(linq: string): string {
  return linq
    .replace(/\./g, " · ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
