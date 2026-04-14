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
    id: "roster_metadata",
    title: "Roster metadata",
    includeRankPctile: false,
    fields: [
      { linq: "roster.ncaa_id", label: "Roster · NCAA ID" },
      { linq: "roster.number", label: "Roster · jersey number" },
      { linq: "roster.height", label: "Roster · height" },
      { linq: "roster.year_class", label: "Roster · year / class" },
      { linq: "roster.pos", label: "Roster · listed position" },
      { linq: "roster.origin", label: "Roster · origin" },
    ],
  },
  {
    id: "advanced_metadata",
    title: "Advanced metadata",
    includeRankPctile: false,
    fields: ["posClass", "posConfidences", "posFreqs", "tier"].map(row),
  },
  {
    id: "transfer_",
    title: "Transfer metadata",
    includeRankPctile: false,
    fields: [
      { linq: "transfer_src", label: "Transfer From" },
      { linq: "transfer_dest", label: "Transfer To" },
    ],
  },
];
