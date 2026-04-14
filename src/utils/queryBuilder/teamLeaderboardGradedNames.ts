import { AdvancedFilterUtils } from "../AdvancedFilterUtils";
import {
  LEADERBOARD_TEAM_STATS_PCTILE_PREFIX,
  LEADERBOARD_TEAM_STATS_RANK_PREFIX,
  LEADERBOARD_TEAM_STATS_RAW_PREFIX,
} from "./leaderboardTeamFieldPrefixes";

/** `team_stats.<field>` in player-leaderboard LINQ (raw slice in the visual builder). */
export function stripLeaderboardTeamRawPrefix(linq: string): string | null {
  if (!linq.startsWith(LEADERBOARD_TEAM_STATS_RAW_PREFIX)) {
    return null;
  }
  return linq.slice(LEADERBOARD_TEAM_STATS_RAW_PREFIX.length);
}

/**
 * Rank/percentile LINQ names for a raw team stat field, matching
 * `AdvancedFilterUtils.playerLboardWithTeamStatsAutocomplete`.
 */
export function rawTeamStatFieldToLeaderboardGradedPair(
  rawStatField: string,
): { rank: string; pctile: string } | null {
  if (!AdvancedFilterUtils.teamFieldHasRank(rawStatField)) {
    return null;
  }
  return {
    rank: `${LEADERBOARD_TEAM_STATS_RANK_PREFIX}${rawStatField}`,
    pctile: `${LEADERBOARD_TEAM_STATS_PCTILE_PREFIX}${rawStatField}`,
  };
}

/**
 * For a cascading row whose `linq` is `team_stats.<stat>`, return rank_/pctile_ pair or null.
 */
export function rawTeamLeaderboardFieldToGradedPair(
  teamPrefixedLinq: string,
): { rank: string; pctile: string } | null {
  const raw = stripLeaderboardTeamRawPrefix(teamPrefixedLinq);
  if (raw == null) {
    return null;
  }
  return rawTeamStatFieldToLeaderboardGradedPair(raw);
}
