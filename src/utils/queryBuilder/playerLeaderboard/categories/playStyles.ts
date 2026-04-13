import type { PlayerQueryBlock } from "../types";
import { humanizePlayerLinqField } from "../humanize";
import { PLAYER_LEADERBOARD_PLAY_STYLE_FIELD_NAMES } from "../../playerLeaderboardPlayStyleFields";

/** Offensive play-style mix stats (pct / usg / ppp), with rank/pctile where available. */
export const playerQueryPlayStyleBlock: PlayerQueryBlock = {
  id: "offensive_play_styles",
  title: "Offensive play styles",
  includeRankPctile: true,
  fields: PLAYER_LEADERBOARD_PLAY_STYLE_FIELD_NAMES.map((linq) => ({
    linq,
    label: humanizePlayerLinqField(linq),
  })),
};
