import { GradeUtils } from "./GradeUtils";

/** Band: inclusive [minRank, maxRank], rank 1 = best (same as GenericTable D1 rank). */
export type PortalTierBand = {
  label: string;
  minRank: number;
  maxRank: number;
};

export type PortalPositionCaveatInput = {
  rosterHeight?: string;
  /** PG..C minute fractions, length ≥ 5; index 4 = center. */
  posFreqs?: number[];
  /** Small-at-center caveat applies only for men's portal eval. */
  gender?: string;
};

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

export type PortalCaveatContext = {
  yearClass?: string;
  /** 0–1 fraction of team possessions; same field as player.off_team_poss_pct.value */
  teamPossPct?: number;
} & PortalPositionCaveatInput;

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

/** Portal prospect eval: tier bands, caveats, and offense/defense notes. */
export class PortalUtils {
  private static readonly RAPM_RTG_DELTA_THRESHOLD = 0.8;

  private static isFiniteNumber(n: unknown): n is number {
    return typeof n === "number" && Number.isFinite(n);
  }

  /** `posFreqs` index for center (same order as PG, SG, SF, PF, C). */
  static readonly PORTAL_POS_FREQ_CENTER_INDEX = 4;

  /** Max height in inches for “small player” caveat (6'7" inclusive). */
  static readonly PORTAL_SMALL_PLAYER_MAX_INCHES = 6 * 12 + 7;

  /** Overlapping tiers — a rank can match multiple bands; join labels with " / ". */
  static readonly PORTAL_TIER_BANDS: readonly PortalTierBand[] = [
    { label: "All-Conf Caliber", minRank: 1, maxRank: 100 },
    { label: "Borderline All-Conf Caliber", minRank: 101, maxRank: 175 },
    { label: "Starter Caliber", minRank: 151, maxRank: 350 },
    { label: "6th Man Type", minRank: 251, maxRank: 500 },
    { label: "Rotation Player", minRank: 351, maxRank: 600 },
    { label: "Borderline Rotation Player", minRank: 601, maxRank: 850 },
  ];

  /** Outside the top 700 by D1 rank (rank 701+). */
  static isDeepBenchRank(rank: number): boolean {
    return rank > 700;
  }

  /**
   * Mirrors {@link GenericTableOps.approxRankOrHtmlFormatter} / grade rank math:
   * rank 1 = best.
   */
  static statisticToD1Rank(s: {
    value?: number;
    samples?: number;
  }): number | null {
    const numSamples = s?.samples || 0;
    if (numSamples <= 0 || !PortalUtils.isFiniteNumber(s?.value)) {
      return null;
    }
    const pctile = s.value || 0;
    return 1 + Math.round((1 - pctile) * numSamples);
  }

  /**
   * Returns every tier label whose band contains `rank`. Also appends Deep Bench when
   * {@link PortalUtils.isDeepBenchRank} applies.
   */
  static categoriesForRank(rank: number | null): string[] {
    if (rank === null || !PortalUtils.isFiniteNumber(rank)) {
      return [];
    }
    const labels = PortalUtils.PORTAL_TIER_BANDS.filter(
      (b) => rank >= b.minRank && rank <= b.maxRank,
    ).map((b) => b.label);
    if (PortalUtils.isDeepBenchRank(rank)) {
      labels.push("Deep Bench");
    }
    return labels;
  }

  static formatCategoryLabel(rank: number | null): string {
    const cats = PortalUtils.categoriesForRank(rank);
    return cats.length > 0 ? cats.join(" / ") : "—";
  }

  static buildPortalCaveats(ctx: PortalCaveatContext): string[] {
    const out: string[] = [];
    const yc = ctx.yearClass?.trim();
    if (yc === "Fr") {
      out.push("Fr → Soph jumps can be very volatile");
    }
    const pct = ctx.teamPossPct;
    if (
      PortalUtils.isFiniteNumber(pct) &&
      pct < GradeUtils.minPossPctForInclusion
    ) {
      out.push(
        `Played few minutes [${(pct * 100).toFixed(1)}%] so treat stats with care`,
      );
    }
    return out;
  }

  /** Base caveats plus position caveat (small player at C). */
  static buildPortalOverallCaveats(ctx: PortalCaveatContext): string[] {
    const out = PortalUtils.buildPortalCaveats(ctx);
    const pos = PortalUtils.caveatSmallPlayerCenterMinutes(ctx);
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
  static portalEvalLeagueLabelForViewer(): string {
    return "high-major";
  }

  static parseHeightToInches(heightStr?: string): number | null {
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

  static caveatSmallPlayerCenterMinutes(
    ctx: PortalPositionCaveatInput,
  ): string | null {
    if (ctx.gender !== "Men") {
      return null;
    }
    const inches = PortalUtils.parseHeightToInches(ctx.rosterHeight);
    if (
      inches === null ||
      inches > PortalUtils.PORTAL_SMALL_PLAYER_MAX_INCHES
    ) {
      return null;
    }
    const cFrac = ctx.posFreqs?.[PortalUtils.PORTAL_POS_FREQ_CENTER_INDEX];
    if (!PortalUtils.isFiniteNumber(cFrac) || cFrac <= 0.15) {
      return null;
    }
    const cPct = (100 * cFrac).toFixed(1);
    return `Small player with [${cPct}%] Center minutes, may not be positionally viable`;
  }

  static portalEvalDefenseRapmNote(
    ctx: Pick<PortalEvalOffenseDefenseSnapshot, "def_adj_rapm" | "def_adj_rtg">,
  ): string | null {
    const rapm = ctx.def_adj_rapm;
    const rtg = ctx.def_adj_rtg;
    if (!PortalUtils.isFiniteNumber(rapm) || !PortalUtils.isFiniteNumber(rtg)) {
      return null;
    }
    const delta = Math.abs(rapm - rtg);
    if (delta <= PortalUtils.RAPM_RTG_DELTA_THRESHOLD) {
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

  static portalEvalOffenseRapmNote(
    ctx: PortalEvalOffenseDefenseSnapshot,
  ): string | null {
    const rapm = ctx.off_adj_rapm;
    const rtg = ctx.off_adj_rtg;
    if (!PortalUtils.isFiniteNumber(rapm) || !PortalUtils.isFiniteNumber(rtg)) {
      return null;
    }
    const delta = Math.abs(rapm - rtg);
    if (delta <= PortalUtils.RAPM_RTG_DELTA_THRESHOLD) {
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
      PortalUtils.isFiniteNumber(usage) &&
      usage < 0.175 &&
      PortalUtils.isFiniteNumber(boxOffRtg) &&
      boxOffRtg > avgE
    ) {
      return `Note: player's RAPM delta from their box-score impact is ${sig}, could be their usage is too low to be impactful`;
    }
    if (
      PortalUtils.isFiniteNumber(usage) &&
      usage > 0.23 &&
      PortalUtils.isFiniteNumber(boxOffRtg) &&
      boxOffRtg < avgE + 5
    ) {
      return `Note: player's RAPM delta from their box-score impact is ${sig}, could take too many low quality shots without gravity to match`;
    }
    return `Note: player's RAPM delta from their box-score impact is ${sig}, unclear why`;
  }

  static portalEvalOffensePredictedUsageWarning(
    ctx: PortalEvalOffenseDefenseSnapshot,
  ): string | null {
    const u = ctx.off_usage_pred;
    const ortg = ctx.off_rtg_pred;
    if (!PortalUtils.isFiniteNumber(u) || !PortalUtils.isFiniteNumber(ortg)) {
      return null;
    }
    if (u >= 0.15 || ortg <= ctx.avgEfficiency) {
      return null;
    }
    return "Warning: to maintain their efficiency, usage may drop to extreme levels";
  }

  /** Defense notes — add/remove/reorder entries here. */
  static readonly PORTAL_DEFENSE_EVAL_RULES: readonly DefenseEvalRule[] = [
    {
      id: "rapmVsBox",
      run: (ctx) => PortalUtils.portalEvalDefenseRapmNote(ctx),
    },
  ];

  /** Offense notes — add/remove/reorder entries here. */
  static readonly PORTAL_OFFENSE_EVAL_RULES: readonly OffenseEvalRule[] = [
    {
      id: "rapmVsBox",
      run: (ctx) => PortalUtils.portalEvalOffenseRapmNote(ctx),
    },
    {
      id: "predUsageEfficiency",
      run: (ctx) => PortalUtils.portalEvalOffensePredictedUsageWarning(ctx),
    },
  ];

  static runDefenseEvalRules(
    ctx: Pick<PortalEvalOffenseDefenseSnapshot, "def_adj_rapm" | "def_adj_rtg">,
  ): string[] {
    return PortalUtils.PORTAL_DEFENSE_EVAL_RULES.map((r) => r.run(ctx)).filter(
      (x): x is string => x != null,
    );
  }

  static runOffenseEvalRules(ctx: PortalEvalOffenseDefenseSnapshot): string[] {
    return PortalUtils.PORTAL_OFFENSE_EVAL_RULES.map((r) => r.run(ctx)).filter(
      (x): x is string => x != null,
    );
  }
}
