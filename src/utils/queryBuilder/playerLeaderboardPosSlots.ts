/**
 * Bracket keys for per-slot `posConfidences` / `posFreqs` in player-leaderboard LINQ.
 * Must stay in sync with {@link AdvancedFilterUtils.convertPositions}.
 */
export const PLAYER_LEADERBOARD_POS_SLOTS = [
  "_PG_",
  "_SG_",
  "_SF_",
  "_PF_",
  "_C_",
] as const;

/** Short labels for UI (PG … C). */
export const PLAYER_LEADERBOARD_POS_SHORT_LABELS = [
  "PG",
  "SG",
  "SF",
  "PF",
  "C",
] as const;
