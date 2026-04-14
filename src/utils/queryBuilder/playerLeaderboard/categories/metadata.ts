import type { PlayerQueryBlock } from "../types";
import { humanizePlayerLinqField } from "../humanize";

const row = (linq: string) => ({ linq, label: humanizePlayerLinqField(linq) });

/** Basic + roster-style metadata (no rank/pctile variants on these tokens). */
export const playerQueryMetadataBlocks: PlayerQueryBlock[] = [
  {
    id: "basic_metadata",
    title: "Basic metadata",
    includeRankPctile: false,
    fields: ["conf", "team", "year", "player_name", "player_code"].map(row),
  },
  {
    id: "advanced_metadata",
    title: "Advanced metadata",
    includeRankPctile: false,
    fields: [
      "posClass",
      "posConfidences",
      "posFreqs",
      "roster.ncaa_id",
      "roster.number",
      "roster.height",
      "roster.year_class",
      "roster.pos",
      "roster.origin",
      "tier",
      "transfer_src",
      "transfer_dest",
    ].map(row),
  },
  {
    id: "transfer_",
    title: "Transfer metadata",
    includeRankPctile: false,
    fields: [
      { linq: "transfer_src", label: "Transfer From" },
      { linq: "transfer_dst", label: "Transfer To" },
    ],
  },
];
