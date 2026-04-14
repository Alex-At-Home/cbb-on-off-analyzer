import type { PlayerQueryBlock } from "../types";
import { humanizePlayerLinqField } from "../humanize";
import {
  PLAYER_LEADERBOARD_POS_SHORT_LABELS,
  PLAYER_LEADERBOARD_POS_SLOTS,
} from "../../playerLeaderboardPosSlots";

const row = (linq: string) => ({ linq, label: humanizePlayerLinqField(linq) });

/** Metadata blocks (no rank/pctile variants on these tokens). */
export const playerQueryMetadataBlocks: PlayerQueryBlock[] = [
  {
    id: "basic_metadata",
    title: "Basic metadata",
    includeRankPctile: false,
    fields: [
      ...["conf", "team", "year", "player_name", "player_code"].map(row),
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
    fields: [
      { linq: "posClass", label: "Positional Role" },
      ...PLAYER_LEADERBOARD_POS_SLOTS.map((slot, i) => ({
        linq: `posConfidences[${slot}]`,
        label: `${PLAYER_LEADERBOARD_POS_SHORT_LABELS[i]!} Model Fit Pct`,
      })),
      ...PLAYER_LEADERBOARD_POS_SLOTS.map((slot, i) => ({
        linq: `posFreqs[${slot}]`,
        label: `Pct Spent At ${PLAYER_LEADERBOARD_POS_SHORT_LABELS[i]!}`,
      })),
      ...["tier"].map(row),
      { linq: "transfer_src", label: "Transfer From" },
      { linq: "transfer_dest", label: "Transfer To" },
      { linq: "hs_region_dmv", label: "HS region — DMV (true/false)" },
    ],
  },
];
