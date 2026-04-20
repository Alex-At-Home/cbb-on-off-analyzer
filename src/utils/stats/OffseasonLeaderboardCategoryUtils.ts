import _ from "lodash";

import type { DivisionStatistics, PureStatSet } from "../StatModels";
import { GradeUtils } from "./GradeUtils";
import { PortalUtils, type PortalTierBand } from "./PortalUtils";
import type { GoodBadOkTriple } from "./TeamEditorUtils";
import { TeamEditorUtils } from "./TeamEditorUtils";
import type { OffseasonTeamInfo } from "./OffseasonLeaderboardUtils";

/** Tournament-path tiers (fallback / goal labels). */
export type OffseasonCategoryTierId =
  | "ff"
  | "t25"
  | "one_digit"
  | "bubble"
  | "out";

/** One roster line in a “Need” bullet (triple retained for PlayerCareer links in UI). */
export type CategoryPathNeedPlayerRef = {
  displayName: string;
  triple: GoodBadOkTriple;
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
   * conference / manual row filter — wider than the normal T75 slice.
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

  /** Primary portal band for a D1 rank (best / smallest minRank among matches). */
  private static primaryPortalBand(rank: number): PortalTierBand | undefined {
    const matching = PortalUtils.PORTAL_TIER_BANDS.filter(
      (b) => rank >= b.minRank && rank <= b.maxRank,
    );
    return _.minBy(matching, (b) => b.minRank);
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
   * Category-path table slice: keep teams whose ok projection sits on the ladder
   * at bubble or better (drops absolute “outside top 60” / `out` rows from the T120 net slice).
   */
  static teamOkProjectedCanReachBubbleContention(
    t: OffseasonTeamInfo,
    sortedByNetDescending: OffseasonTeamInfo[],
    priorSeasonTeamDivisionStats: DivisionStatistics | undefined,
    netRankOrdinalFallback: number,
  ): boolean {
    const fb = OffseasonLeaderboardCategoryUtils.tierFromOkPredictedNet(
      t.net,
      sortedByNetDescending,
      priorSeasonTeamDivisionStats,
      netRankOrdinalFallback,
    );
    return fb !== "out";
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
        players: _.sortBy(list, [(x) => -x.d]).map((x) => ({
          displayName: OffseasonLeaderboardCategoryUtils.playerDisplayName(
            x.triple,
          ),
          triple: x.triple,
        })),
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
      const netRank = netRankByTeam[t.team];
      if (netRank === undefined) continue;

      const fb = OffseasonLeaderboardCategoryUtils.tierFromOkPredictedNet(
        t.net,
        sortedByNetDescending,
        priorSeasonTeamDivisionStats,
        netRank,
      );
      const goalTier =
        OffseasonLeaderboardCategoryUtils.goalTierFromFallback(fb);
      if (!goalTier) continue;

      const cutoff =
        OffseasonLeaderboardCategoryUtils.rankCutoffForTier(goalTier);
      const thresh = OffseasonLeaderboardCategoryUtils.thresholdNetForGoalRank(
        sortedByNetDescending,
        cutoff,
        priorSeasonTeamDivisionStats,
      );
      if (thresh === undefined) continue;

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
          continue;
        }

        if (needResult.outcome === "too_many_swings") {
          const fbCut = OffseasonLeaderboardCategoryUtils.rankCutoffForTier(fb);
          const fbThresh =
            OffseasonLeaderboardCategoryUtils.thresholdNetForGoalRank(
              sortedByNetDescending,
              fbCut,
              priorSeasonTeamDivisionStats,
            );
          if (fbThresh === undefined) {
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
          kNeed = d.k;
          if (d.remainderOrAny) {
            kNeed = Math.max(kNeed, d.remainderOrAny.k);
          }
          analysisNeedDetail = d;
          analysisText =
            OffseasonLeaderboardCategoryUtils.plainTextFromNeedDetail(d);
        }
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
