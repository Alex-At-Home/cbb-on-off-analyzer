/** Default label for a raw LINQ field token (title-ish case). */
export function humanizePlayerLinqField(linq: string): string {
  return linq
    .replace(/\./g, " · ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace("Ast", linq.endsWith("_ast") ? "Assisted%" : "Assists For")
    .replace("Threepr", "3P Rate")
    .replace("Twoprimr", "2P (mid-range) Rate")
    .replace("Twopmidr", "2P (rim) Rate")
    .replace("Ftr", "FT Rate")
    .replace("Threep", "3P Rate")
    .replace("Twop", "2P%")
    .replace("Twoprim", "2P% (mid-range)")
    .replace("Twopmid", "2P% (rim)")
    .replace("Ft", "FT%");
}
