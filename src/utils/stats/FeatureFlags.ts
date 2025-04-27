export class FeatureFlags {
  /** Where possible can be extra safe checking that we're developing on a laptop */
  static isActiveWindow(ff: boolean): boolean {
    if (!ff) {
      return false;
    } else {
      const server =
        typeof window === `undefined` //(ensures SSR code still compiles)
          ? "server"
          : window.location.hostname;
      return server == "localhost";
    }
  }
  // Feature flags themselves:

  /** Some long term work on showing guesses as to the play types players use */
  static readonly betterStyleAnalysis = true;

  /** For team editor - short term work on generating make-believe NIL estimates - otherwise just a user-editable field */
  static readonly estimateNilValue = false;

  /** For team editor - showing the caliber of a player */
  static readonly playerCaliberMode = false;

  /** For player editor in roster table - allows messing with shot selection metrics */
  static readonly advancedPlayerEditor = true;

  /** For work in progress on player leaderboard (want to have single line view) */
  static readonly expandedPlayerLeaderboard = false;
}
