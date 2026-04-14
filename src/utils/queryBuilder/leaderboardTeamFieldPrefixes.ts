/**
 * How team-scoped stats are written in **player-leaderboard** LINQ today
 * (`AdvancedFilterUtils.playerLboardWithTeamStatsAutocomplete` / `tidyPlayerClauses`).
 *
 * Keep prefix strings here so a future standalone team explorer can swap policy
 * (e.g. bare field names) without touching the visual query builder UI.
 */
export const LEADERBOARD_TEAM_STATS_RAW_PREFIX = "team_stats." as const;
export const LEADERBOARD_TEAM_STATS_RANK_PREFIX = "rank_team_stats." as const;
export const LEADERBOARD_TEAM_STATS_PCTILE_PREFIX =
  "pctile_team_stats." as const;

export type LeaderboardRuleSource = "player" | "team" | "custom";
