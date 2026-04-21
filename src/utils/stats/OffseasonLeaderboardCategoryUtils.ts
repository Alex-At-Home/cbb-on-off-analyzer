import _ from "lodash";

import { GenericTableOps } from "../../components/GenericTable";
import type { DivisionStatistics, PureStatSet } from "../StatModels";
import { GradeUtils } from "./GradeUtils";
import { PortalUtils, type PortalTierBand } from "./PortalUtils";
import type { GoodBadOkTriple } from "./TeamEditorUtils";
import { TeamEditorUtils } from "./TeamEditorUtils";
import type { OffseasonTeamInfo } from "./OffseasonLeaderboardUtils";

/** Set `true` to log `[category-path-trace]` for {@link DEBUG_TRACE_CATEGORY_PATH_TEAM_NAME}. */
export const DEBUG_TRACE_CATEGORY_PATH_TEAM = false;
/** Must match {@link OffseasonTeamInfo.team} exactly (e.g. `"UCLA"`). */
export const DEBUG_TRACE_CATEGORY_PATH_TEAM_NAME = "TeamName";

/** Tournament-path tiers (fallback / goal labels). */
export type OffseasonCategoryTierId =
  | "ff"
  | "t25"
  | "one_digit"
  | "bubble"
  | "out";

/**
 * Position bucket for **good** projection D1 rank within that projection’s primary portal band:
 * top **33%** / middle **34%** / bottom **33%** of the band span.
 */
export type CategoryPathNeedBandQuartile = "top" | "middle" | "bottom";

/** One roster line in a “Need” bullet (triple retained for PlayerCareer links in UI). */
export type CategoryPathNeedPlayerRef = {
  displayName: string;
  triple: GoodBadOkTriple;
  bandQuartile: CategoryPathNeedBandQuartile;
  rankCurrentLabel: string;
  /** Primary portal tier label for the **ok** (current) projection, e.g. “Starter Caliber”. */
  okCurrentTierLabel: string;
  rankUpsideLabel: string;
  marginalPtsPer100: number;
  /** Good projection’s primary portal band (same as top/middle/bottom span / range in tooltip). */
  portalBandLabel: string;
  bandMinRank: number;
  bandMaxRank: number;
};

/** Grouped roster entries for category-path “Need” display (optimistic tier / good projection). */
export type CategoryPathNeedGroup = {
  categoryLabel: string;
  sortKey: number;
  players: CategoryPathNeedPlayerRef[];
};

export type CategoryPathNeedDetail = {
  quantifier: "any" | "all";
  k: number;
  groups: CategoryPathNeedGroup[];
  /**
   * When primary is “Need any 1” with only 1–3 solo names: greedy combo among
   * remaining rotation players that also clears the gap (`Or all N of:` / `Or both:` — every
   * listed player’s marginal swing must hit together).
   */
  remainderOrAny?: {
    quantifier: "any" | "all";
    k: number;
    groups: CategoryPathNeedGroup[];
  };
};

/** Result of {@link OffseasonLeaderboardCategoryUtils.buildNeedDetailFromTriples}. */
export type BuildCategoryPathNeedResult =
  | { outcome: "detail"; detail: CategoryPathNeedDetail }
  | { outcome: "too_many_swings" }
  | { outcome: "impossible" };

export type OffseasonCategoryPathComputedRow = {
  team: string;
  conf: string;
  goalLabel: string;
  fallbackLabel: string;
  analysisText: string;
  /** Structured bullets when gap > 0 and upside path exists. */
  analysisNeedDetail?: CategoryPathNeedDetail;
  /** Lower = earlier in “goal” sort (more ambitious goal tier first). */
  goalSortKey: number;
  /** National net rating threshold for this goal (includes 0.5 pts/100 grace). */
  goalThresholdNet: number;
  /**
   * Sort-only difficulty between primary and optional **Or …** need lines: mean of their `k`
   * values (when there is no remainder, this equals primary `k`).
   */
  kSwings: number;
  net: number;
  netRank: number;
  teamInfo: OffseasonTeamInfo;
};

export class OffseasonLeaderboardCategoryUtils {
  static readonly TIER_RANK_FF = 8;
  static readonly TIER_RANK_T25 = 25;
  static readonly TIER_RANK_ONE_DIGIT = 40;
  static readonly TIER_RANK_BUBBLE = 60;

  /**
   * National teams (by net) passed into {@link buildCategoryPathRows} when no
   * conference / manual row filter — top N by net, wider than the normal T75 slice.
   */
  static readonly CATEGORY_PATH_TABLE_TEAM_CAP = 120;

  /** Only the top-N rotation players (ok team poss %) feed upside / need lists. */
  static readonly MAX_UPSIDE_PLAYERS_IN_POOL = 7;
  /** Minimum ok possession share (e.g. 0.4 = 40% of team possessions) to enter that pool. */
  static readonly MIN_POSS_PCT_FOR_UPSIDE_POOL = 0.4;
  /** Max swings in a “Need all k” line; more than this → Goal = Else + “No bad luck!”. */
  static readonly MAX_SWINGS_IN_NEED_LIST = 5;

  /** Grace margin (pts/100) applied so thresholds are slightly easier than the raw boundary net. */
  static readonly NET_THRESHOLD_GRACE_PTS = 0.5;

  private static readonly tierLabels: Record<OffseasonCategoryTierId, string> =
    {
      ff: "Final Four",
      t25: "Top 25",
      one_digit: "1-digit seed",
      bubble: "Bubble",
      out: "Outside top 60",
    };

  /** Short Else-column labels for category-path table (aligned with {@link tierLabels}). */
  static readonly elseTierAbbreviation: Record<
    OffseasonCategoryTierId,
    string
  > = {
    ff: "FF",
    t25: "T25",
    one_digit: "S6-9",
    bubble: "Bub",
    out: ">T60",
  };

  /**
   * Maps Else column prose (from {@link tierLabels}) to abbreviations: FF, T25, S6-9, Bub, &gt;T60.
   */
  static elseAbbrevFromFallbackLabel(fallbackLabel: string): string {
    const entry = _.find(
      _.toPairs(OffseasonLeaderboardCategoryUtils.tierLabels),
      ([, lab]) => lab === fallbackLabel,
    );
    if (!entry) return fallbackLabel;
    const tier = entry[0] as OffseasonCategoryTierId;
    return OffseasonLeaderboardCategoryUtils.elseTierAbbreviation[tier];
  }

  /**
   * Within one Goal section (same `goalSortKey`), cumulative % of teams with {@link OffseasonCategoryPathComputedRow.kSwings}
   * at most this row’s value (lower need = better; integer 0–100).
   */
  static kNeedCumulativePercentileInGoalGroup(
    group: OffseasonCategoryPathComputedRow[],
    row: OffseasonCategoryPathComputedRow,
  ): number {
    const n = group.length;
    if (n === 0) return 0;
    const k = row.kSwings;
    const le = _.sumBy(group, (r) => (r.kSwings <= k + 1e-9 ? 1 : 0));
    return Math.round((100 * le) / n);
  }

  /** Primary portal band for a D1 rank (best / smallest minRank among matches). */
  private static primaryPortalBand(rank: number): PortalTierBand | undefined {
    const matching = PortalUtils.PORTAL_TIER_BANDS.filter(
      (b) => rank >= b.minRank && rank <= b.maxRank,
    );
    return _.minBy(matching, (b) => b.minRank);
  }

  /**
   * Within {@link primaryPortalBand(rank)} on normalized position in the band span:
   * best **33%** → `top`, worst **33%** → `bottom`, middle **34%** → `middle`.
   * Used with **good** projection rank for Need chips.
   */
  static bandQuartileInPrimaryPortalBand(
    d1Rank: number | null,
  ): CategoryPathNeedBandQuartile {
    if (d1Rank === null || !Number.isFinite(d1Rank)) {
      return "middle";
    }
    const band = OffseasonLeaderboardCategoryUtils.primaryPortalBand(d1Rank);
    if (!band) return "middle";
    const span = band.maxRank - band.minRank;
    if (span <= 0) return "middle";
    const posInBand = (d1Rank - band.minRank) / span;
    if (posInBand <= 0.33) return "top";
    if (posInBand >= 0.67) return "bottom";
    return "middle";
  }

  /** One Need-list player row (ranks, marginal swing, portal band for tooltip + arrows). */
  static buildCategoryPathNeedPlayerRef(
    triple: GoodBadOkTriple,
    playerDivisionStats: DivisionStatistics | undefined,
  ): CategoryPathNeedPlayerRef {
    const okRank = OffseasonLeaderboardCategoryUtils.netD1RankFromTriple(
      triple,
      "ok",
      playerDivisionStats,
    );
    const goodRank = OffseasonLeaderboardCategoryUtils.netD1RankFromTriple(
      triple,
      "good",
      playerDivisionStats,
    );
    const marginal =
      OffseasonLeaderboardCategoryUtils.playerMarginalGoodMinusOk(triple);

    let okCurrentTierLabel = "—";
    if (okRank !== null) {
      const okBand =
        OffseasonLeaderboardCategoryUtils.primaryPortalBand(okRank);
      if (okBand) {
        okCurrentTierLabel = okBand.label;
      }
    }

    let portalBandLabel = "—";
    let bandMinRank = 0;
    let bandMaxRank = 0;
    if (goodRank !== null) {
      const goodBand =
        OffseasonLeaderboardCategoryUtils.primaryPortalBand(goodRank);
      if (goodBand) {
        portalBandLabel = goodBand.label;
        bandMinRank = goodBand.minRank;
        bandMaxRank = goodBand.maxRank;
      }
    }

    const rankCurrentLabel =
      okRank !== null ? `T${GenericTableOps.getApproxRank(okRank)}` : "—";
    const rankUpsideLabel =
      goodRank !== null ? `T${GenericTableOps.getApproxRank(goodRank)}` : "—";

    return {
      displayName: OffseasonLeaderboardCategoryUtils.playerDisplayName(triple),
      triple,
      bandQuartile:
        OffseasonLeaderboardCategoryUtils.bandQuartileInPrimaryPortalBand(
          goodRank,
        ),
      rankCurrentLabel,
      okCurrentTierLabel,
      rankUpsideLabel,
      marginalPtsPer100: marginal,
      portalBandLabel,
      bandMinRank,
      bandMaxRank,
    };
  }

  /** Plain-text tooltip for a category-path Need list player chip. */
  static categoryPathNeedPlayerTooltipText(
    p: CategoryPathNeedPlayerRef,
  ): string {
    const delta = p.marginalPtsPer100.toFixed(1);
    const currently =
      p.okCurrentTierLabel !== "—"
        ? `(currently ${p.rankCurrentLabel}, ${p.okCurrentTierLabel})`
        : `(currently ${p.rankCurrentLabel})`;
    const base = `${p.displayName} ${currently} needs to hit their upside of ${p.rankUpsideLabel} (delta [${delta}] pts/100`;
    if (p.portalBandLabel === "—") {
      return `${base})`;
    }
    return `${base}, ${p.bandQuartile} of [${p.portalBandLabel}] range [${p.bandMinRank}:${p.bandMaxRank}])`;
  }

  /** Next better band label toward rank 1; null if already in the top band row. */
  static nextBetterPortalTierLabel(rank: number): string | null {
    const primary = OffseasonLeaderboardCategoryUtils.primaryPortalBand(rank);
    if (!primary) return null;
    const bestFirst = [...PortalUtils.PORTAL_TIER_BANDS].sort(
      (a, b) => a.minRank - b.minRank,
    );
    const idx = bestFirst.findIndex((b) => b.label === primary.label);
    if (idx <= 0) return null;
    return bestFirst[idx - 1]!.label;
  }

  static netRankTier(netRank: number): OffseasonCategoryTierId {
    if (netRank <= OffseasonLeaderboardCategoryUtils.TIER_RANK_FF) return "ff";
    if (netRank <= OffseasonLeaderboardCategoryUtils.TIER_RANK_T25)
      return "t25";
    if (netRank <= OffseasonLeaderboardCategoryUtils.TIER_RANK_ONE_DIGIT)
      return "one_digit";
    if (netRank <= OffseasonLeaderboardCategoryUtils.TIER_RANK_BUBBLE)
      return "bubble";
    return "out";
  }

  /**
   * Next ladder tier toward FF (used for Goal column).
   * When already in {@link OffseasonCategoryTierId} ff, goal stays ff — “hold” Final Four tier vs the T8 cutline.
   */
  static goalTierFromFallback(
    fb: OffseasonCategoryTierId,
  ): OffseasonCategoryTierId | undefined {
    switch (fb) {
      case "out":
        return "bubble";
      case "bubble":
        return "one_digit";
      case "one_digit":
        return "t25";
      case "t25":
        return "ff";
      case "ff":
        return "ff";
      default:
        return undefined;
    }
  }

  /** Rank cutoff (inclusive “in this tier or better”) for the goal tier bucket. */
  static rankCutoffForTier(tier: OffseasonCategoryTierId): number {
    switch (tier) {
      case "ff":
        return OffseasonLeaderboardCategoryUtils.TIER_RANK_FF;
      case "t25":
        return OffseasonLeaderboardCategoryUtils.TIER_RANK_T25;
      case "one_digit":
        return OffseasonLeaderboardCategoryUtils.TIER_RANK_ONE_DIGIT;
      case "bubble":
        return OffseasonLeaderboardCategoryUtils.TIER_RANK_BUBBLE;
      default:
        return OffseasonLeaderboardCategoryUtils.TIER_RANK_BUBBLE;
    }
  }

  /**
   * Net rating at the boundary for “top R teams” on this ladder: the R-th best team’s net
   * (sorted predicted nets descending).
   */
  static ratingAtTopRankBoundary(
    sortedByNetDescending: OffseasonTeamInfo[],
    rankOneIndexed: number,
  ): number | undefined {
    const n = sortedByNetDescending.length;
    if (n === 0 || rankOneIndexed < 1) return undefined;
    const idx = Math.min(rankOneIndexed, n) - 1;
    return sortedByNetDescending[idx]?.net;
  }

  /**
   * Threshold net for a goal tier cutline (rank 8 / 25 / …).
   * Prefer {@link GradeUtils.adjustedNetAtNationalRankFromDivisionStats} on **prior-season**
   * team Combo division stats; fall back to the current projected ladder if unavailable.
   */
  static thresholdNetForGoalRank(
    sortedByNetDescending: OffseasonTeamInfo[],
    rankCutoff: number,
    priorSeasonTeamDivisionStats?: DivisionStatistics,
  ): number | undefined {
    const rawPrior = GradeUtils.adjustedNetAtNationalRankFromDivisionStats(
      priorSeasonTeamDivisionStats,
      rankCutoff,
    );
    const rawFallback =
      OffseasonLeaderboardCategoryUtils.ratingAtTopRankBoundary(
        sortedByNetDescending,
        rankCutoff,
      );
    const raw = rawPrior !== undefined ? rawPrior : rawFallback;
    if (raw === undefined) return undefined;
    return raw - OffseasonLeaderboardCategoryUtils.NET_THRESHOLD_GRACE_PTS;
  }

  /**
   * “Else” tier: ok (balanced) projected team net vs the **same** absolute cutlines as
   * {@link thresholdNetForGoalRank} (prior-season national ladder when loaded). Not ordinal rank.
   * Falls back to {@link netRankTier} only when no cutlines can be resolved.
   */
  static tierFromOkPredictedNet(
    okNet: number,
    sortedByNetDescending: OffseasonTeamInfo[],
    priorSeasonTeamDivisionStats: DivisionStatistics | undefined,
    netRankOrdinalFallback: number,
  ): OffseasonCategoryTierId {
    const cut = (rank: number) =>
      OffseasonLeaderboardCategoryUtils.thresholdNetForGoalRank(
        sortedByNetDescending,
        rank,
        priorSeasonTeamDivisionStats,
      );

    const b8 = cut(OffseasonLeaderboardCategoryUtils.TIER_RANK_FF);
    const b25 = cut(OffseasonLeaderboardCategoryUtils.TIER_RANK_T25);
    const b40 = cut(OffseasonLeaderboardCategoryUtils.TIER_RANK_ONE_DIGIT);
    const b60 = cut(OffseasonLeaderboardCategoryUtils.TIER_RANK_BUBBLE);

    if (b8 !== undefined && okNet >= b8) return "ff";
    if (b25 !== undefined && okNet >= b25) return "t25";
    if (b40 !== undefined && okNet >= b40) return "one_digit";
    if (b60 !== undefined && okNet >= b60) return "bubble";

    if (
      b8 === undefined &&
      b25 === undefined &&
      b40 === undefined &&
      b60 === undefined
    ) {
      return OffseasonLeaderboardCategoryUtils.netRankTier(
        netRankOrdinalFallback,
      );
    }

    return "out";
  }

  static playerMarginalGoodMinusOk(triple: GoodBadOkTriple): number {
    const poss = triple.ok?.off_team_poss_pct?.value ?? 0;
    const d =
      TeamEditorUtils.getNet(triple.good) - TeamEditorUtils.getNet(triple.ok);
    return poss * d;
  }

  /**
   * Players with ok poss % ≥ {@link MIN_POSS_PCT_FOR_UPSIDE_POOL}, top
   * {@link MAX_UPSIDE_PLAYERS_IN_POOL} by minutes, then positive marginal swing only,
   * ordered by `d` descending for greedy need logic.
   */
  static topPossPoolForUpside(
    players: GoodBadOkTriple[],
  ): { triple: GoodBadOkTriple; d: number }[] {
    const n = OffseasonLeaderboardCategoryUtils.MAX_UPSIDE_PLAYERS_IN_POOL;
    const minPoss =
      OffseasonLeaderboardCategoryUtils.MIN_POSS_PCT_FOR_UPSIDE_POOL;
    const withPoss = players.map((triple) => ({
      triple,
      d: OffseasonLeaderboardCategoryUtils.playerMarginalGoodMinusOk(triple),
      possPct: triple.ok?.off_team_poss_pct?.value ?? 0,
    }));
    const eligibleByMins = _.filter(withPoss, (x) => x.possPct >= minPoss);
    const topByMins = _.orderBy(
      eligibleByMins,
      [(x) => x.possPct],
      ["desc"],
    ).slice(0, n);
    const positiveSwings = _.filter(topByMins, (x) => x.d > 0);
    return _.orderBy(positiveSwings, [(x) => x.d], ["desc"]).map((x) => ({
      triple: x.triple,
      d: x.d,
    }));
  }

  /**
   * Display name for roster rows — use `orig.key` (“Last, First”).
   * Do not parse {@link GoodBadOkTriple.key}: transfers use `code:SCHOOL_TEAM:year`
   * so text after the first colon is often the player’s **previous school**, not their name.
   */
  static playerDisplayName(triple: GoodBadOkTriple): string {
    const fromOrig = triple.orig?.key?.trim();
    if (fromOrig) return fromOrig;
    const code = triple.orig?.code?.trim();
    if (code) return code;
    const k = triple.key || "";
    const colon = k.indexOf(":");
    return colon >= 0 ? k.slice(0, colon).trim() || k : k;
  }

  /** Clause only, e.g. “is All-Conf Caliber” / “is closer to …”. */
  private static playerTierEvalClause(
    triple: GoodBadOkTriple,
    playerDivisionStats: DivisionStatistics | undefined,
  ): string {
    const goodRank = OffseasonLeaderboardCategoryUtils.netD1RankFromTriple(
      triple,
      "good",
      playerDivisionStats,
    );
    const okRank = OffseasonLeaderboardCategoryUtils.netD1RankFromTriple(
      triple,
      "ok",
      playerDivisionStats,
    );
    if (goodRank == null || !playerDivisionStats) {
      return "(impact tier loading…)";
    }
    const goodLab = PortalUtils.formatCategoryLabel(goodRank);
    const okLab = PortalUtils.formatCategoryLabel(okRank);
    if (goodLab !== okLab && okLab !== "—") {
      return `is ${goodLab}`;
    }
    const nextLab =
      OffseasonLeaderboardCategoryUtils.nextBetterPortalTierLabel(goodRank);
    if (!nextLab) {
      return "is All American";
    }
    return `is closer to ${nextLab}`;
  }

  /** `[Last, First] is …` for analysis column. */
  static playerEvalBracketPhrase(
    triple: GoodBadOkTriple,
    playerDivisionStats: DivisionStatistics | undefined,
  ): string {
    const name = OffseasonLeaderboardCategoryUtils.playerDisplayName(triple);
    const clause = OffseasonLeaderboardCategoryUtils.playerTierEvalClause(
      triple,
      playerDivisionStats,
    );
    return `[${name}] ${clause}`;
  }

  /** Good projection: rank for sort; prose label aligned with bracket clause (POY vs band text). */
  private static groupingLabelForGoodProjection(
    triple: GoodBadOkTriple,
    playerDivisionStats: DivisionStatistics | undefined,
  ): { sortKey: number; label: string } {
    const goodRank = OffseasonLeaderboardCategoryUtils.netD1RankFromTriple(
      triple,
      "good",
      playerDivisionStats,
    );
    if (goodRank == null || !playerDivisionStats) {
      return { sortKey: 99999, label: "(impact tier loading…)" };
    }
    const clause = OffseasonLeaderboardCategoryUtils.playerTierEvalClause(
      triple,
      playerDivisionStats,
    );
    const label =
      clause.startsWith("(impact") || clause.includes("loading")
        ? PortalUtils.formatCategoryLabel(goodRank)
        : clause.replace(/^is\s+/i, "").trim();

    return {
      sortKey: goodRank,
      label,
    };
  }

  private static groupPlayersForNeedDisplay(
    entries: { triple: GoodBadOkTriple; d: number }[],
    playerDivisionStats: DivisionStatistics | undefined,
  ): CategoryPathNeedGroup[] {
    type Entry = { triple: GoodBadOkTriple; d: number };
    const withMeta: (Entry & {
      meta: { sortKey: number; label: string };
    })[] = entries.map((e) => ({
      ...e,
      meta: OffseasonLeaderboardCategoryUtils.groupingLabelForGoodProjection(
        e.triple,
        playerDivisionStats,
      ),
    }));
    const byLabel = _.groupBy(withMeta, (e) => e.meta.label);
    return _.orderBy(
      _.map(byLabel, (list, categoryLabel) => ({
        categoryLabel,
        sortKey: list[0]!.meta.sortKey,
        players: _.sortBy(list, [(x) => -x.d]).map((x) =>
          OffseasonLeaderboardCategoryUtils.buildCategoryPathNeedPlayerRef(
            x.triple,
            playerDivisionStats,
          ),
        ),
      })),
      [(g) => g.sortKey],
      ["asc"],
    );
  }

  /**
   * Solo swing clears gap → “any 1”, list solo clearers (pool already ≤7 by minutes).
   * Else minimal greedy prefix by `d`; if that prefix length exceeds
   * {@link MAX_SWINGS_IN_NEED_LIST}, returns {@link BuildCategoryPathNeedResult} `too_many_swings`.
   */
  static buildNeedDetailFromTriples(
    triplesSorted: { triple: GoodBadOkTriple; d: number }[],
    gap: number,
    playerDivisionStats: DivisionStatistics | undefined,
  ): BuildCategoryPathNeedResult {
    const maxK = OffseasonLeaderboardCategoryUtils.MAX_SWINGS_IN_NEED_LIST;

    if (gap <= 0 || triplesSorted.length === 0) {
      return { outcome: "impossible" };
    }

    const solo = triplesSorted.filter((x) => x.d >= gap);
    let entries: typeof triplesSorted;
    let quantifier: "any" | "all";
    let k: number;

    if (solo.length > 0) {
      quantifier = "any";
      k = 1;
      entries = solo;
    } else {
      let sum = 0;
      let take = 0;
      for (let i = 0; i < triplesSorted.length; i++) {
        sum += triplesSorted[i]!.d;
        take = i + 1;
        if (sum >= gap) break;
      }
      if (sum < gap) {
        return { outcome: "impossible" };
      }

      if (take > maxK) {
        return { outcome: "too_many_swings" };
      }

      quantifier = "all";
      k = take;
      entries = triplesSorted.slice(0, take);
    }

    const groups = OffseasonLeaderboardCategoryUtils.groupPlayersForNeedDisplay(
      entries,
      playerDivisionStats,
    );

    let detail: CategoryPathNeedDetail = { quantifier, k, groups };

    if (
      quantifier === "any" &&
      k === 1 &&
      solo.length >= 1 &&
      solo.length <= 3
    ) {
      const remainderCombo =
        OffseasonLeaderboardCategoryUtils.remainderCombinationNeedOrUndefined(
          triplesSorted,
          solo,
          gap,
          playerDivisionStats,
          maxK,
        );
      if (remainderCombo) {
        detail = { ...detail, remainderOrAny: remainderCombo };
      }
    }

    return {
      outcome: "detail",
      detail,
    };
  }

  /**
   * Exclude solo-clearers (by triple key), greedy prefix on rest by current `d` sort.
   * Requires at least 2 players (no one in remainder clears alone) and k ≤ maxK.
   */
  private static remainderCombinationNeedOrUndefined(
    triplesSorted: { triple: GoodBadOkTriple; d: number }[],
    soloClearers: { triple: GoodBadOkTriple; d: number }[],
    gap: number,
    playerDivisionStats: DivisionStatistics | undefined,
    maxK: number,
  ):
    | { k: number; groups: CategoryPathNeedGroup[]; quantifier: "any" | "all" }
    | undefined {
    const soloKeys = new Set(soloClearers.map((x) => x.triple.key));
    const remaining = triplesSorted.filter((x) => !soloKeys.has(x.triple.key));

    let sum = 0;
    let take = 0;
    for (let i = 0; i < remaining.length; i++) {
      sum += remaining[i]!.d;
      take = i + 1;
      if (sum >= gap) break;
    }

    if (sum < gap || take < 2 || take > maxK) {
      return undefined;
    }

    const entries = remaining.slice(0, take);
    const groups = OffseasonLeaderboardCategoryUtils.groupPlayersForNeedDisplay(
      entries,
      playerDivisionStats,
    );

    return {
      k: take,
      groups,
      quantifier:
        _.sumBy(groups, (g) => g.players.length) == take ? "all" : "any",
    };
  }

  /** UI / plain-text heading for primary “Need …” block. */
  static formatPrimaryNeedHeading(
    quantifier: "any" | "all",
    k: number,
  ): string {
    if (quantifier === "all" && k === 2) {
      return "Need both:";
    }
    return `Need ${quantifier} ${k} of:`;
  }

  /** UI / plain-text heading for remainder “Or …” combo block. */
  static formatRemainderNeedHeading(
    quantifier: "any" | "all",
    k: number,
  ): string {
    if (quantifier === "all" && k === 2) {
      return "Or eg both:";
    }
    return `Or ${quantifier} ${k} of:`;
  }

  /**
   * Short “What’s needed” line when {@link OffseasonLeaderboardParams.summaryGoalDetails} is on
   * (primary `k` and optional remainder `k`, e.g. `+1-2 things go well`).
   */
  static summaryThingsGoWellFromNeedDetail(
    detail: CategoryPathNeedDetail,
  ): string {
    const ks = [detail.k];
    if (detail.remainderOrAny) {
      ks.push(detail.remainderOrAny.k);
    }
    const lo = Math.min(...ks);
    const hi = Math.max(...ks);
    if (lo === hi) {
      return `+${lo} things go well`;
    }
    return `+${lo}-${hi} things go well`;
  }

  static plainTextFromNeedDetail(detail: CategoryPathNeedDetail): string {
    const blockLines = (
      heading: string,
      groups: CategoryPathNeedGroup[],
    ): string[] => [
      heading,
      ...groups.map(
        (g) =>
          `* ${g.categoryLabel}: ${g.players.map((p) => `[${p.displayName}]`).join(", ")}`,
      ),
    ];

    const primaryLines = blockLines(
      OffseasonLeaderboardCategoryUtils.formatPrimaryNeedHeading(
        detail.quantifier,
        detail.k,
      ),
      detail.groups,
    );

    if (!detail.remainderOrAny) {
      return primaryLines.join("\n");
    }

    const orLines = blockLines(
      OffseasonLeaderboardCategoryUtils.formatRemainderNeedHeading(
        detail.remainderOrAny.quantifier,
        detail.remainderOrAny.k,
      ),
      detail.remainderOrAny.groups,
    );

    return [...primaryLines, "", ...orLines].join("\n");
  }

  private static netD1RankFromTriple(
    triple: GoodBadOkTriple,
    range: "good" | "ok",
    playerDivisionStats: DivisionStatistics | undefined,
  ): number | null {
    if (!playerDivisionStats) return null;
    const s = triple[range];
    const netPred = TeamEditorUtils.getNet(s);
    const statsToGrade = {
      ...s,
      off_adj_rapm_margin: { value: netPred },
    } as unknown as PureStatSet;
    const graded = GradeUtils.buildPlayerPercentiles(
      playerDivisionStats,
      statsToGrade,
      ["off_adj_rapm_margin"],
      true,
    );
    return PortalUtils.statisticToD1Rank(
      graded.off_adj_rapm_margin as { value?: number; samples?: number },
    );
  }

  /**
   * Build filtered, sorted rows for the category-path table.
   * @param netRankByTeam national net rank (1 = best), one entry per team name.
   */
  static buildCategoryPathRows(
    teamRanksInDisplayOrder: OffseasonTeamInfo[],
    netRankByTeam: Record<string, number>,
    sortedByNetDescending: OffseasonTeamInfo[],
    playerDivisionStats: DivisionStatistics | undefined,
    priorSeasonTeamDivisionStats?: DivisionStatistics,
  ): OffseasonCategoryPathComputedRow[] {
    const rows: OffseasonCategoryPathComputedRow[] = [];

    for (const t of teamRanksInDisplayOrder) {
      const trace =
        DEBUG_TRACE_CATEGORY_PATH_TEAM &&
        t.team === DEBUG_TRACE_CATEGORY_PATH_TEAM_NAME;

      const netRank = netRankByTeam[t.team];
      if (netRank === undefined) {
        if (trace) {
          console.info("[category-path-trace] SKIP net_rank_undefined", {
            team: t.team,
            net: t.net,
            conf: t.conf,
          });
        }
        continue;
      }

      const fb = OffseasonLeaderboardCategoryUtils.tierFromOkPredictedNet(
        t.net,
        sortedByNetDescending,
        priorSeasonTeamDivisionStats,
        netRank,
      );
      const goalTier =
        OffseasonLeaderboardCategoryUtils.goalTierFromFallback(fb);
      if (!goalTier) {
        if (trace) {
          console.info("[category-path-trace] SKIP goal_tier_null", {
            team: t.team,
            fb,
            netRank,
          });
        }
        continue;
      }

      const cutoff =
        OffseasonLeaderboardCategoryUtils.rankCutoffForTier(goalTier);
      const thresh = OffseasonLeaderboardCategoryUtils.thresholdNetForGoalRank(
        sortedByNetDescending,
        cutoff,
        priorSeasonTeamDivisionStats,
      );
      if (thresh === undefined) {
        if (trace) {
          console.info("[category-path-trace] SKIP goal_thresh_undefined", {
            team: t.team,
            goalTier,
            cutoff,
            netRank,
          });
        }
        continue;
      }

      const gap = thresh - t.net;

      const players = t.players || [];
      const triplesSorted =
        OffseasonLeaderboardCategoryUtils.topPossPoolForUpside(players);

      let kNeed = 0;
      let analysisText = "";
      let analysisNeedDetail: CategoryPathNeedDetail | undefined;
      let goalLabelOut = OffseasonLeaderboardCategoryUtils.tierLabels[goalTier];
      let goalSortKeyOut = cutoff;
      let goalThresholdNetOut = thresh;

      if (gap <= 0) {
        analysisText =
          fb === goalTier
            ? "No bad luck!"
            : "Any sort of positive variance should be enough";
      } else {
        const needResult =
          OffseasonLeaderboardCategoryUtils.buildNeedDetailFromTriples(
            triplesSorted,
            gap,
            playerDivisionStats,
          );

        if (needResult.outcome === "impossible") {
          if (trace) {
            console.info(
              "[category-path-trace] KEEP need_impossible_fallback",
              {
                team: t.team,
                stretchGoalTier: goalTier,
                gapToStretchGoal: gap,
                upsidePoolLen: triplesSorted.length,
                sumD: _.sumBy(triplesSorted, (x) => x.d),
                bucketGoalTierDisplay: fb === "out" ? "bubble" : fb,
              },
            );
          }
          /**
           * Stretch goal (`goalTier` = one step above Else) isn’t reachable with listed
           * marginal swings — bucket the row by **Else tier** (`fb`) so Goal matches the same
           * ladder band as Else (e.g. both Top 25), not under Final Four headers.
           * Pure `out`Else → bucket Goal as Bubble (never “Outside top 60” as Goal).
           */
          const goalTierDisplay: OffseasonCategoryTierId =
            fb === "out" ? "bubble" : fb;
          const displayCut =
            OffseasonLeaderboardCategoryUtils.rankCutoffForTier(
              goalTierDisplay,
            );
          const displayThresh =
            OffseasonLeaderboardCategoryUtils.thresholdNetForGoalRank(
              sortedByNetDescending,
              displayCut,
              priorSeasonTeamDivisionStats,
            );
          goalLabelOut =
            OffseasonLeaderboardCategoryUtils.tierLabels[goalTierDisplay];
          goalSortKeyOut = displayCut;
          if (displayThresh !== undefined) {
            goalThresholdNetOut = displayThresh;
          }
          const gapDisplay =
            displayThresh !== undefined ? displayThresh - t.net : gap;
          if (gapDisplay <= 0) {
            analysisText =
              fb === goalTierDisplay
                ? "No bad luck!"
                : "Any sort of positive variance should be enough";
          } else {
            analysisText =
              triplesSorted.length === 0
                ? "No marginal-upside projections (good vs ok) among the top possession-minute players for a named need breakdown."
                : "Marginal swings among listed players don’t reach this net gap together.";
          }
          analysisNeedDetail = undefined;
          kNeed = 0;
        } else if (needResult.outcome === "too_many_swings") {
          /**
           * Goal headers are only FF / Top 25 / 1-digit / Bubble. Never use “Outside top 60”
           * as Goal — that tier is Else-only. Teams below the bubble ladder (`fb === out`) with
           * too many marginal swings don’t get a compact path row here.
           */
          if (fb === "out") {
            if (trace) {
              console.info(
                "[category-path-trace] SKIP too_many_swings_fb_out",
                { team: t.team, gap },
              );
            }
            continue;
          }
          const fbCut = OffseasonLeaderboardCategoryUtils.rankCutoffForTier(fb);
          const fbThresh =
            OffseasonLeaderboardCategoryUtils.thresholdNetForGoalRank(
              sortedByNetDescending,
              fbCut,
              priorSeasonTeamDivisionStats,
            );
          if (fbThresh === undefined) {
            if (trace) {
              console.info(
                "[category-path-trace] SKIP too_many_swings_fb_thresh_undefined",
                { team: t.team, fb, fbCut },
              );
            }
            continue;
          }

          goalLabelOut = OffseasonLeaderboardCategoryUtils.tierLabels[fb];
          goalSortKeyOut = fbCut;
          goalThresholdNetOut = fbThresh;
          analysisText = "No bad luck!";
          analysisNeedDetail = undefined;
          kNeed = 0;
        } else {
          const d = needResult.detail;
          const kAlt = d.remainderOrAny?.k ?? d.k;
          // Sort key: primary `k`, slightly penalized if the alternate “Or …” path needs more players.
          kNeed = (d.k + kAlt) / 2;
          analysisNeedDetail = d;
          analysisText =
            OffseasonLeaderboardCategoryUtils.plainTextFromNeedDetail(d);
        }
      }

      if (trace) {
        console.info("[category-path-trace] KEEP row", {
          team: t.team,
          fb,
          goalTier,
          goalLabel: goalLabelOut,
          gap,
          kSwings: kNeed,
        });
      }

      rows.push({
        team: t.team,
        conf: t.conf,
        goalLabel: goalLabelOut,
        fallbackLabel: OffseasonLeaderboardCategoryUtils.tierLabels[fb],
        analysisText,
        analysisNeedDetail,
        goalSortKey: goalSortKeyOut,
        goalThresholdNet: goalThresholdNetOut,
        kSwings: kNeed,
        net: t.net,
        netRank,
        teamInfo: t,
      });
    }

    return _.orderBy(
      rows,
      [(r) => -r.goalSortKey, (r) => r.kSwings, (r) => r.net],
      ["desc", "asc", "desc"],
    );
  }
}
