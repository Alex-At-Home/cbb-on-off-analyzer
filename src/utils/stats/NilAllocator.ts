/**
 * Bottom-up NIL valuation (dollars from target team net, roster budget, replacement level).
 * Aligns with the framework described in Nik Oza's college basketball valuation writeup.
 */

export const NIL_ALLOCATOR_DEFAULT_DESIRED_NET = 20;
export const NIL_REPLACEMENT_LEVEL = -1;
export const NIL_N_ON_COURT = 5;
const MIN_TOTAL_IMPROVEMENT = 1e-3;

export function parseNilBudgetMillions(
  raw: string | undefined,
): number | undefined {
  if (raw === undefined || raw === null || String(raw).trim() === "") {
    return undefined;
  }
  const n = parseFloat(String(raw));
  if (!Number.isFinite(n) || n < 0) {
    return undefined;
  }
  return n;
}

export function parseNilDesiredNet(raw: string | undefined): number {
  if (raw === undefined || raw === null || String(raw).trim() === "") {
    return NIL_ALLOCATOR_DEFAULT_DESIRED_NET;
  }
  const n = parseFloat(String(raw));
  if (!Number.isFinite(n)) {
    return NIL_ALLOCATOR_DEFAULT_DESIRED_NET;
  }
  return n;
}

/** Marginal team-quality points from replacement baseline to desired net (five on court). */
export function totalImprovementNeededPoints(
  desiredNet: number,
  replacementLevel: number = NIL_REPLACEMENT_LEVEL,
  nOnCourt: number = NIL_N_ON_COURT,
): number {
  return desiredNet - nOnCourt * replacementLevel;
}

export function nilAutoPoolDollars(
  estimatedBudgetDollars: number,
  manualSum: number,
): number {
  return Math.max(0, estimatedBudgetDollars - manualSum);
}

/** Dollars per marginal rating point; undefined if denominator invalid. */
export function nilSpendingRatePerPoint(
  autoPoolDollars: number,
  desiredNet: number,
): number | undefined {
  const timp = totalImprovementNeededPoints(desiredNet);
  if (timp < MIN_TOTAL_IMPROVEMENT) {
    return undefined;
  }
  return autoPoolDollars / timp;
}

/**
 * possPct should match Team Editor: off_team_poss_pct so that possPct*40 = mpg.
 * projectedNetPer100 = getNet(statSet, 1.0).
 */
export function nilMarginalPointsAboveReplacement(
  projectedNetPer100: number,
  possPct: number,
  replacementLevel: number = NIL_REPLACEMENT_LEVEL,
): number {
  return (projectedNetPer100 - replacementLevel) * possPct;
}

export function nilAutoDollarsFromMarginalPoints(
  marginalPts: number,
  spendingRatePerPoint: number,
): number {
  return marginalPts * spendingRatePerPoint;
}

/** Full-budget $ per marginal rating point (for comparing manual vs model). */
export function nilFullBudgetDollarsPerMarginalPoint(
  budgetDollars: number,
  desiredNet: number,
): number | undefined {
  const timp = totalImprovementNeededPoints(desiredNet);
  if (timp < MIN_TOTAL_IMPROVEMENT) {
    return undefined;
  }
  return budgetDollars / timp;
}

/** Full-budget $M per marginal pt — for team tooltip. */
export function nilFullBudgetMillionsPerMarginalPoint(
  budgetMillions: number,
  desiredNet: number,
): number | undefined {
  const timp = totalImprovementNeededPoints(desiredNet);
  if (timp < MIN_TOTAL_IMPROVEMENT) {
    return undefined;
  }
  return budgetMillions / timp;
}
