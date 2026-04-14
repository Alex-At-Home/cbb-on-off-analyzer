import _ from "lodash";
import { GradeUtils } from "../stats/GradeUtils";
import { PLAYER_LEADERBOARD_PLAY_STYLE_FIELD_NAMES } from "./playerLeaderboardPlayStyleFields";

/**
 * Maps a GradeUtils.playerFields key to the rank_/pctile_ autocomplete token
 * (same rules as AdvancedFilterUtils.playerLeaderBoardAutocomplete).
 */
export function gradeFieldKeyToGradedLinqName(
  prefix: "rank_" | "pctile_",
  field: string,
): string {
  if (field == "def_ftr") {
    return `${prefix}def_fc`;
  }
  if (field == "def_2prim") {
    return `${prefix}def_blk`;
  }
  if (field == "def_to") {
    return `${prefix}def_stl`;
  }
  if (field.endsWith("_margin") && field.startsWith("off_")) {
    return `${prefix}${field.substring(4)}`;
  }
  return `${prefix}${field.replace("2p", "twop").replace("3p", "threep")}`;
}

/** All rank_/pctile_ field names that appear on the player leaderboard autocomplete list. */
export function buildPlayerLeaderboardGradedFieldNameSet(): Set<string> {
  const names: string[] = [];
  for (const p of ["rank_", "pctile_"] as const) {
    for (const field of _.keys(GradeUtils.playerFields)) {
      names.push(gradeFieldKeyToGradedLinqName(p, field));
    }
  }
  names.push(
    "rank_off_reb",
    "rank_def_reb",
    "pctile_off_reb",
    "pctile_def_reb",
  );
  for (const p of ["rank_", "pctile_"] as const) {
    for (const field of PLAYER_LEADERBOARD_PLAY_STYLE_FIELD_NAMES) {
      names.push(`${p}${field}`);
    }
  }
  return new Set(names);
}

const gradedFieldSet = buildPlayerLeaderboardGradedFieldNameSet();

/** If both rank and pctile LINQ fields exist for this raw field name, return them. */
export function rawFieldToGradedPair(
  rawLinqField: string,
): { rank: string; pctile: string } | null {
  const rank = `rank_${rawLinqField}`;
  const pctile = `pctile_${rawLinqField}`;
  if (gradedFieldSet.has(rank) && gradedFieldSet.has(pctile)) {
    return { rank, pctile };
  }
  return null;
}

export function isGradedLinqField(name: string): boolean {
  return gradedFieldSet.has(name);
}
