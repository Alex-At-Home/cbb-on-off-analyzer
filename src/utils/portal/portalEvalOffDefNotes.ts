/**
 * Offense / defense eval notes and position caveats for portal prospect eval.
 * Rules are grouped in exported arrays so they are easy to add, remove, or reorder.
 */

export type PortalPositionCaveatInput = {
  rosterHeight?: string;
  /** PG..C minute fractions, length ≥ 5; index 4 = center. */
  posFreqs?: number[];
};

const RAPM_RTG_DELTA_THRESHOLD = 0.8;

/** `posFreqs` index for center (same order as PG, SG, SF, PF, C). */
export const PORTAL_POS_FREQ_CENTER_INDEX = 4;

/** Max height in inches for “small player” caveat (6'7" inclusive). */
export const PORTAL_SMALL_PLAYER_MAX_INCHES = 6 * 12 + 7;

export function parseHeightToInches(heightStr?: string): number | null {
  if (!heightStr || heightStr === "-") {
    return null;
  }
  const match = heightStr.match(/(\d+)-(\d+)/);
  if (!match) {
    return null;
  }
  const feet = parseInt(match[1], 10);
  const inches = parseInt(match[2], 10);
  if (!Number.isFinite(feet) || !Number.isFinite(inches)) {
    return null;
  }
  return feet * 12 + inches;
}

function isFiniteNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

export type PortalEvalOffenseDefenseSnapshot = {
  def_adj_rapm?: number;
  def_adj_rtg?: number;
  off_adj_rapm?: number;
  off_adj_rtg?: number;
  /** Box offensive rating (IndivTableDefs `rtg` / “Box Rtg”), not Adj+. */
  off_rtg?: number;
  off_usage?: number;
  off_usage_pred?: number;
  off_rtg_pred?: number;
  avgEfficiency: number;
};

export function caveatSmallPlayerCenterMinutes(
  ctx: PortalPositionCaveatInput,
): string | null {
  const inches = parseHeightToInches(ctx.rosterHeight);
  if (inches === null || inches > PORTAL_SMALL_PLAYER_MAX_INCHES) {
    return null;
  }
  const cFrac = ctx.posFreqs?.[PORTAL_POS_FREQ_CENTER_INDEX];
  if (!isFiniteNumber(cFrac) || cFrac <= 0.15) {
    return null;
  }
  const cPct = (100 * cFrac).toFixed(1);
  return `Small player with [${cPct}%] Center minutes, may not be positionally viable`;
}

export function portalEvalDefenseRapmNote(
  ctx: Pick<PortalEvalOffenseDefenseSnapshot, "def_adj_rapm" | "def_adj_rtg">,
): string | null {
  const rapm = ctx.def_adj_rapm;
  const rtg = ctx.def_adj_rtg;
  if (!isFiniteNumber(rapm) || !isFiniteNumber(rtg)) {
    return null;
  }
  const delta = Math.abs(rapm - rtg);
  if (delta <= RAPM_RTG_DELTA_THRESHOLD) {
    return null;
  }
  const better = rapm < rtg;
  const bw = better ? "better" : "worse";
  const sig = `significant ([${delta.toFixed(1)}] ${bw})`;
  const reason = better
    ? "eg maybe good off-ball defense, maybe impact defender, could just be variance"
    : "eg maybe poor off-ball defense, maybe hides on defense, could just be variance";
  return `Note: player's RAPM delta from their box-score impact is ${sig}, ${reason}`;
}

export function portalEvalOffenseRapmNote(
  ctx: PortalEvalOffenseDefenseSnapshot,
): string | null {
  const rapm = ctx.off_adj_rapm;
  const rtg = ctx.off_adj_rtg;
  if (!isFiniteNumber(rapm) || !isFiniteNumber(rtg)) {
    return null;
  }
  const delta = Math.abs(rapm - rtg);
  if (delta <= RAPM_RTG_DELTA_THRESHOLD) {
    return null;
  }
  const better = rapm >= rtg;
  const bw = better ? "better" : "worse";
  const sig = `significant ([${delta.toFixed(1)}] ${bw})`;
  if (better) {
    const reason =
      "eg maybe strong on-ball creation, maybe box-score undervalues spacing, could just be variance";
    return `Note: player's RAPM delta from their box-score impact is ${sig}, ${reason}`;
  }
  const usage = ctx.off_usage;
  const avgE = ctx.avgEfficiency;
  const boxOffRtg = ctx.off_rtg;
  if (
    isFiniteNumber(usage) &&
    usage < 0.175 &&
    isFiniteNumber(boxOffRtg) &&
    boxOffRtg > avgE
  ) {
    return `Note: player's RAPM delta from their box-score impact is ${sig}, could be their usage is too low to be impactful`;
  }
  // Box Rtg (off_rtg) vs D1 avg + 5 — high usage but raw box offensive rating below that bar.
  if (
    isFiniteNumber(usage) &&
    usage > 0.23 &&
    isFiniteNumber(boxOffRtg) &&
    boxOffRtg < avgE + 5
  ) {
    return `Note: player's RAPM delta from their box-score impact is ${sig}, could take too many low quality shots without gravity to match`;
  }
  return `Note: player's RAPM delta from their box-score impact is ${sig}, unclear why`;
}

export function portalEvalOffensePredictedUsageWarning(
  ctx: PortalEvalOffenseDefenseSnapshot,
): string | null {
  const u = ctx.off_usage_pred;
  const ortg = ctx.off_rtg_pred;
  if (!isFiniteNumber(u) || !isFiniteNumber(ortg)) {
    return null;
  }
  if (u >= 0.15 || ortg <= ctx.avgEfficiency) {
    return null;
  }
  return "Warning: to maintain their efficiency, usage may drop to extreme levels";
}

export type DefenseEvalRule = {
  id: string;
  run: (
    ctx: Pick<PortalEvalOffenseDefenseSnapshot, "def_adj_rapm" | "def_adj_rtg">,
  ) => string | null;
};

export type OffenseEvalRule = {
  id: string;
  run: (ctx: PortalEvalOffenseDefenseSnapshot) => string | null;
};

/** Defense notes — add/remove/reorder entries here. */
export const PORTAL_DEFENSE_EVAL_RULES: readonly DefenseEvalRule[] = [
  { id: "rapmVsBox", run: portalEvalDefenseRapmNote },
];

/** Offense notes — add/remove/reorder entries here. */
export const PORTAL_OFFENSE_EVAL_RULES: readonly OffenseEvalRule[] = [
  { id: "rapmVsBox", run: portalEvalOffenseRapmNote },
  { id: "predUsageEfficiency", run: portalEvalOffensePredictedUsageWarning },
];

export function runDefenseEvalRules(
  ctx: Pick<PortalEvalOffenseDefenseSnapshot, "def_adj_rapm" | "def_adj_rtg">,
): string[] {
  return PORTAL_DEFENSE_EVAL_RULES.map((r) => r.run(ctx)).filter(
    (x): x is string => x != null,
  );
}

export function runOffenseEvalRules(
  ctx: PortalEvalOffenseDefenseSnapshot,
): string[] {
  return PORTAL_OFFENSE_EVAL_RULES.map((r) => r.run(ctx)).filter(
    (x): x is string => x != null,
  );
}
