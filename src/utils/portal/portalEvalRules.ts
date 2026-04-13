import { GradeUtils } from "../stats/GradeUtils";
import {
  caveatSmallPlayerCenterMinutes,
  type PortalPositionCaveatInput,
} from "./portalEvalOffDefNotes";

/** Band: inclusive [minRank, maxRank], rank 1 = best (same as GenericTable D1 rank). */
export type PortalTierBand = {
  label: string;
  minRank: number;
  maxRank: number;
};

/** Overlapping tiers — a rank can match multiple bands; join labels with " / ". */
export const PORTAL_TIER_BANDS: PortalTierBand[] = [
  { label: "All-Conf Caliber", minRank: 1, maxRank: 100 },
  { label: "Borderline All-Conf Caliber", minRank: 101, maxRank: 175 },
  { label: "Starter Caliber", minRank: 151, maxRank: 350 },
  { label: "6th Man Type", minRank: 251, maxRank: 500 },
  { label: "Rotation Player", minRank: 351, maxRank: 600 },
  { label: "Borderline Rotation Player", minRank: 601, maxRank: 850 },
];

/** Outside the top 700 by D1 rank (rank 701+). */
export function isDeepBenchRank(rank: number): boolean {
  return rank > 700;
}

function isFiniteNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

/**
 * Mirrors {@link GenericTableOps.approxRankOrHtmlFormatter} / grade rank math:
 * rank 1 = best.
 */
export function statisticToD1Rank(s: {
  value?: number;
  samples?: number;
}): number | null {
  const numSamples = s?.samples || 0;
  if (numSamples <= 0 || !isFiniteNumber(s?.value)) {
    return null;
  }
  const pctile = s.value || 0;
  return 1 + Math.round((1 - pctile) * numSamples);
}

/**
 * Returns every tier label whose band contains `rank`. Also appends Deep Bench when
 * {@link isDeepBenchRank} applies.
 */
export function categoriesForRank(rank: number | null): string[] {
  if (rank === null || !isFiniteNumber(rank)) {
    return [];
  }
  const labels = PORTAL_TIER_BANDS.filter(
    (b) => rank >= b.minRank && rank <= b.maxRank,
  ).map((b) => b.label);
  if (isDeepBenchRank(rank)) {
    labels.push("Deep Bench");
  }
  return labels;
}

export function formatCategoryLabel(rank: number | null): string {
  const cats = categoriesForRank(rank);
  return cats.length > 0 ? cats.join(" / ") : "—";
}

export type PortalCaveatContext = {
  yearClass?: string;
  /** 0–1 fraction of team possessions; same field as player.off_team_poss_pct.value */
  teamPossPct?: number;
} & PortalPositionCaveatInput;

export function buildPortalCaveats(ctx: PortalCaveatContext): string[] {
  const out: string[] = [];
  const yc = ctx.yearClass?.trim();
  if (yc === "Fr") {
    out.push("Fr → Soph jumps can be very volatile");
  }
  const pct = ctx.teamPossPct;
  if (isFiniteNumber(pct) && pct < GradeUtils.minPossPctForInclusion) {
    out.push(
      `Played few minutes [${(pct * 100).toFixed(1)}%] so treat stats with care`,
    );
  }
  return out;
}

/** Base caveats plus position caveat (small player at C). */
export function buildPortalOverallCaveats(ctx: PortalCaveatContext): string[] {
  const out = buildPortalCaveats(ctx);
  const pos = caveatSmallPlayerCenterMinutes(ctx);
  if (pos) {
    out.push(pos);
  }
  return out;
}

/**
 * League tier label in portal eval prose (the **viewer’s / destination** team context,
 * never the player’s current school). For now always `high-major`. Later: when the user
 * has a saved/target team, derive tiers and band rules from that team — not from the
 * player row’s `team`.
 */
export function portalEvalLeagueLabelForViewer(): string {
  return "high-major";
}
