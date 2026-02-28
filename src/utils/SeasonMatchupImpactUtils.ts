/**
 * Per-game impact and table row builders for Season Matchup Analyzer.
 * New file — no changes to existing utils.
 */
import _ from "lodash";
import { CommonFilterParams, LuckParams, ParamDefaults } from "./FilterModels";
import { SeasonMatchupPerGame } from "../components/SeasonMatchupFilter";
import { LineupStatsModel } from "../components/LineupStatsTable";
import { RosterStatsModel } from "../components/RosterStatsTable";
import { TeamStatsModel } from "../components/TeamStatsTable";
import { GameAnalysisUtils, GameStatsCache } from "./tables/GameAnalysisUtils";
import { StatModels } from "./StatModels";
import type { IndivStatSet, IndivPosInfo, Statistic } from "./StatModels";
import { LineupUtils, PlayerOnOffStats } from "./stats/LineupUtils";
import { RatingUtils } from "./stats/RatingUtils";
import {
  buildTotalRow,
  IMPACT_DECOMP_DATA_COL_KEYS,
} from "./ImpactBreakdownTableUtils";

const debugMode = false;

export type GameImpactRow = {
  gameLabel: string;
  gameInfo: Record<string, unknown>;
  title: string;
  team_poss_pct: Statistic;
  off_team_poss_pct?: Statistic;
  def_team_poss_pct?: Statistic;
  diff_adj_rapm?: { value: number; extraInfo?: string };
  off_adj_rapm?: { value: number; extraInfo?: string };
  def_adj_rapm?: { value: number; extraInfo?: string };
  off_sos_bonus?: Statistic;
  off_gravity_bonus?: Statistic;
  off_net_3p?: Statistic;
  off_net_mid?: Statistic;
  off_net_rim?: Statistic;
  off_net_ft?: Statistic;
  off_net_ast?: Statistic;
  off_net_to?: Statistic;
  off_net_orb?: Statistic;
  def_sos_bonus?: Statistic;
  def_gravity_bonus?: Statistic;
};

const ZERO_CELL = { value: 0 };
const emptyTeam = StatModels.emptyTeam();

/** Option value for "Team" (sum of all players) in the quick toggles. */
export const SEASON_MATCHUP_TEAM_KEY = "Team";

/** Field options for the impact chart (key, label). Default is diff_adj_rapm (Net). */
export const CHART_FIELD_OPTIONS: {
  key: keyof GameImpactRow;
  label: string;
}[] = [
  { key: "diff_adj_rapm", label: "Net" },
  { key: "off_adj_rapm", label: "Off. Net" },
  { key: "def_adj_rapm", label: "Def. Net" },
  { key: "off_net_3p", label: "3P%" },
  { key: "off_net_mid", label: "2P% Mid" },
  { key: "off_net_rim", label: "2P% Rim" },
  { key: "off_net_ft", label: "FT" },
  { key: "off_net_ast", label: "AST" },
  { key: "off_net_to", label: "TO" },
  { key: "off_net_orb", label: "ORB" },
  { key: "off_sos_bonus", label: "Off. SoSΔ" },
  { key: "off_gravity_bonus", label: "Off. GΔ" },
  { key: "def_sos_bonus", label: "Def. SoSΔ" },
  { key: "def_gravity_bonus", label: "Def. GΔ" },
];

/** Get pts for/against from a game. */
function getPtsForAgainst(g: SeasonMatchupPerGame): {
  ptsFor: number;
  ptsAgainst: number;
} {
  const ts = g.teamStats as any;
  const gi = g.gameInfo as any;
  const ptsFor =
    ts?.total_off_pts?.value ?? gi?.num_pts_for?.value ?? gi?.num_pts_for ?? 0;
  const ptsAgainst =
    ts?.total_def_pts?.value ??
    gi?.num_pts_against?.value ??
    gi?.num_pts_against ??
    0;
  return {
    ptsFor: typeof ptsFor === "number" ? ptsFor : 0,
    ptsAgainst: typeof ptsAgainst === "number" ? ptsAgainst : 0,
  };
}

/** Get game score differential (pts for - pts against) from a game. */
export function getScoreDiffForGame(g: SeasonMatchupPerGame): number {
  const { ptsFor, ptsAgainst } = getPtsForAgainst(g);
  return ptsFor - ptsAgainst;
}

/** Get display score string e.g. "86-64". */
export function getScoreStrForGame(g: SeasonMatchupPerGame): string {
  const { ptsFor, ptsAgainst } = getPtsForAgainst(g);
  return `${ptsFor}-${ptsAgainst}`;
}

const NUMERIC_KEYS: (keyof GameImpactRow)[] = [
  "team_poss_pct",
  "diff_adj_rapm",
  "off_adj_rapm",
  "def_adj_rapm",
  "off_sos_bonus",
  "off_gravity_bonus",
  "off_net_3p",
  "off_net_mid",
  "off_net_rim",
  "off_net_ft",
  "off_net_ast",
  "off_net_to",
  "off_net_orb",
  "def_sos_bonus",
  "def_gravity_bonus",
];

/** Build team/roster/lineup models for one game so we can call buildGameRapmStats. */
function perGameToModels(
  game: SeasonMatchupPerGame,
  team: string,
): {
  teamStats: TeamStatsModel;
  rosterStats: RosterStatsModel;
  lineupStats: LineupStatsModel;
} {
  const teamBucket =
    game.teamStats && _.size(game.teamStats) > 0 ? game.teamStats : emptyTeam;
  const playerBuckets = Array.isArray(game.rosterStats) ? game.rosterStats : [];
  const lineupBucketsList = Array.isArray((game.lineupStats as any)?.lineups)
    ? (game.lineupStats as any).lineups
    : [];

  const rosterInfo = (
    game as SeasonMatchupPerGame & { rosterInfo?: Record<string, any> }
  ).rosterInfo;
  const teamBaseline = (
    game as SeasonMatchupPerGame & { teamStatsBaseline?: any }
  ).teamStatsBaseline;
  const rosterBaseline = (
    game as SeasonMatchupPerGame & { rosterStatsBaseline?: any[] }
  ).rosterStatsBaseline;
  const seasonTeam =
    teamBaseline && _.size(teamBaseline) > 0 ? teamBaseline : teamBucket;
  const seasonRoster =
    Array.isArray(rosterBaseline) && rosterBaseline.length > 0
      ? rosterBaseline
      : playerBuckets;
  const teamStats: TeamStatsModel = {
    on: emptyTeam,
    off: emptyTeam,
    other: [],
    baseline: teamBucket as any,
    global: { ...(seasonTeam as any), roster: rosterInfo ?? {} },
  };
  const rosterStats: RosterStatsModel = {
    on: [],
    off: [],
    other: [],
    baseline: playerBuckets as any,
    global: seasonRoster as any,
  };
  const lineupStats: LineupStatsModel = {
    lineups: lineupBucketsList,
  };
  return { teamStats, rosterStats, lineupStats };
}

/** Build one GameImpactRow for one player in one game. */
function buildOnePlayerGameRow(
  g: SeasonMatchupPerGame,
  _cache: GameStatsCache,
  enriched: { playerId: string; rapm?: any },
  statObj: any,
  avgEfficiency: number,
  scaleType: "P%" | "T%" | "/G",
  adjBreakdownForSoS: boolean,
): GameImpactRow {
  const offPoss = (statObj?.off_team_poss_pct as any)?.value ?? 0;
  const defPoss = (statObj?.def_team_poss_pct as any)?.value ?? 0;
  const possPct = 0.5 * offPoss + 0.5 * defPoss;

  if (possPct <= 0) {
    return {
      gameLabel: g.gameLabel,
      gameInfo: g.gameInfo as Record<string, unknown>,
      title: g.gameLabel,
      team_poss_pct: { value: possPct },
      off_team_poss_pct: { value: offPoss },
      def_team_poss_pct: { value: defPoss },
    };
  }

  const offRapm = enriched?.rapm?.off_adj_ppp?.value ?? 0;
  const defRapm = enriched?.rapm?.def_adj_ppp?.value ?? 0;
  const ortgDiag = (statObj as any)?.diag_off_rtg;
  const drtgDiag = (statObj as any)?.diag_def_rtg;

  if (ortgDiag && drtgDiag && statObj && enriched) {
    (statObj as any).off_adj_rapm = enriched.rapm?.off_adj_ppp;
    (statObj as any).def_adj_rapm = enriched.rapm?.def_adj_ppp;
    const netPoints = RatingUtils.buildNetPoints(
      statObj as any,
      ortgDiag,
      drtgDiag,
      avgEfficiency,
      scaleType,
      1,
      scaleType === "T%" ? 1 : 1,
    );
    const offSosAdj = adjBreakdownForSoS ? 0 : netPoints.offNetPtsSos;
    const defSosAdj = adjBreakdownForSoS ? 0 : netPoints.defNetPtsSos;
    const offNetAst = netPoints.offNetPtsAst2 + netPoints.offNetPtsAst3;

    const row: GameImpactRow = {
      gameLabel: g.gameLabel,
      gameInfo: g.gameInfo as Record<string, unknown>,
      title: g.gameLabel,
      team_poss_pct: { value: possPct },
      off_team_poss_pct: { value: offPoss },
      def_team_poss_pct: { value: defPoss },
      diff_adj_rapm: {
        value:
          netPoints.offNetPts - netPoints.defNetPts - offSosAdj - defSosAdj,
      },
      off_adj_rapm: { value: netPoints.offNetPts - offSosAdj },
      def_adj_rapm: { value: -netPoints.defNetPts - defSosAdj },
      off_sos_bonus: { value: netPoints.offNetPtsSos },
      off_gravity_bonus: {
        value: netPoints.offNetPtsWowy + netPoints.offNetPtsVolume,
        extraInfo: `RAPM/WOWY bonus: [${netPoints.offNetPtsWowy.toFixed(2)}]pts, Shot volume bonus: [${netPoints.offNetPtsVolume.toFixed(2)}]pts`,
      },
      off_net_3p: { value: netPoints.offNetPts3P },
      off_net_mid: { value: netPoints.offNetPtsMid },
      off_net_rim: { value: netPoints.offNetPtsRim },
      off_net_ft: { value: netPoints.offNetPtsFt },
      off_net_ast: {
        value: offNetAst,
        extraInfo: `2P Assists: [${netPoints.offNetPtsAst2.toFixed(2)}]pts, 3P Assists: [${netPoints.offNetPtsAst3.toFixed(2)}]pts`,
      },
      off_net_to: { value: netPoints.offNetPtsTo },
      off_net_orb: { value: netPoints.offNetPtsOrb },
      def_sos_bonus: { value: netPoints.defNetPtsSos },
      def_gravity_bonus: { value: -netPoints.defNetPtsWowy },
    };
    return row;
  }
  return {
    gameLabel: g.gameLabel,
    gameInfo: g.gameInfo as Record<string, unknown>,
    title: g.gameLabel,
    team_poss_pct: { value: possPct },
    off_team_poss_pct: { value: offPoss },
    def_team_poss_pct: { value: defPoss },
    diff_adj_rapm: { value: offRapm - defRapm },
    off_adj_rapm: { value: offRapm },
    def_adj_rapm: { value: defRapm },
  };
}

/** Derive [offPoss, defPoss] per game for possession-differential adjustment.
 * Returns fractions (e.g. 0.53, 0.56) to match buildTotalRow / PlayerImpactChart perGamePoss. */
export function getPossPerGame(
  g: SeasonMatchupPerGame,
): [number, number] | undefined {
  const ts = g.teamStats as any;
  const gi = g.gameInfo as any;
  const offRaw =
    ts?.off_poss?.value ??
    ts?.total_off_poss?.value ??
    gi?.num_off_poss?.value ??
    gi?.num_off_poss;
  const defRaw =
    ts?.def_poss?.value ??
    ts?.total_def_poss?.value ??
    gi?.num_def_poss?.value ??
    gi?.num_def_poss;
  if (typeof offRaw !== "number" || typeof defRaw !== "number")
    return undefined;
  // Match chart: 0.01 * value so raw 53 -> 0.53 for buildTotalRow formula
  return [0.01 * offRaw, 0.01 * defRaw];
}

/** Convert GameImpactRow to the record shape expected by buildTotalRow. */
function gameImpactRowToTotalRowInput(
  row: GameImpactRow,
): Record<string, Statistic> {
  const offPoss = row.off_team_poss_pct?.value ?? row.team_poss_pct?.value ?? 0;
  const defPoss = row.def_team_poss_pct?.value ?? row.team_poss_pct?.value ?? 0;
  const out: Record<string, Statistic> = {
    off_team_poss_pct: { value: offPoss },
    def_team_poss_pct: { value: defPoss },
  };
  for (const key of IMPACT_DECOMP_DATA_COL_KEYS) {
    const cell = row[key as keyof GameImpactRow];
    if (cell && typeof cell === "object" && "value" in cell)
      out[key] = { value: (cell as Statistic).value };
  }
  return out;
}

/** Convert buildTotalRow output + game meta back to GameImpactRow. */
function totalRowToGameImpactRow(
  total: Record<string, { value: number; extraInfo?: string }>,
  g: SeasonMatchupPerGame,
  avgTeamPossPct: number,
): GameImpactRow {
  const cv = (k: string) => ({ value: total[k]?.value ?? 0 });
  return {
    gameLabel: g.gameLabel,
    gameInfo: g.gameInfo as Record<string, unknown>,
    title: g.gameLabel,
    team_poss_pct: { value: avgTeamPossPct },
    diff_adj_rapm: cv("diff_adj_rapm"),
    off_adj_rapm: cv("off_adj_rapm"),
    def_adj_rapm: cv("def_adj_rapm"),
    off_sos_bonus: cv("off_sos_bonus"),
    off_gravity_bonus: cv("off_gravity_bonus"),
    off_net_3p: cv("off_net_3p"),
    off_net_mid: cv("off_net_mid"),
    off_net_rim: cv("off_net_rim"),
    off_net_ft: cv("off_net_ft"),
    off_net_ast: cv("off_net_ast"),
    off_net_to: cv("off_net_to"),
    off_net_orb: cv("off_net_orb"),
    def_sos_bonus: cv("def_sos_bonus"),
    def_gravity_bonus: cv("def_gravity_bonus"),
  };
}

/** Sum numeric .value fields of multiple rows into one row. */
function sumImpactRows(
  rows: GameImpactRow[],
  template: GameImpactRow,
): GameImpactRow {
  if (rows.length === 0) return template;
  const sum = { ...template };
  for (const key of NUMERIC_KEYS) {
    (sum as any)[key] = { value: 0 };
  }
  for (const row of rows) {
    for (const key of NUMERIC_KEYS) {
      (sum as any)[key].value += (row[key] as Statistic).value;
    }
  }
  return sum as GameImpactRow;
}

/**
 * Expensive: run once when games load. For each game, build RAPM + playerInfo for
 * all players via GameAnalysisUtils.buildGameRapmStats. Cache the result per game.
 */
export function buildPerGameRapmCaches(
  games: SeasonMatchupPerGame[],
  commonParams: CommonFilterParams,
  avgEfficiency: number,
): GameStatsCache[] {
  const team = commonParams.team || "";
  const luckConfig: LuckParams = { base: ParamDefaults.defaultLuckConfig.base };
  const adjustForLuck = false;

  return games.map((g) => {
    const { teamStats, rosterStats, lineupStats } = perGameToModels(g, team);
    return GameAnalysisUtils.buildGameRapmStats(
      team,
      commonParams,
      lineupStats,
      teamStats,
      rosterStats,
      adjustForLuck,
      luckConfig,
      avgEfficiency,
      true,
    );
  });
}

/**
 * Build one GameStatsCache for the full season using baseline (season) stats and
 * merged lineups from all games. Uses same pipeline as buildLeaderboards:
 * buildEnrichedLineups + buildOrInjectRapm with singleGameMode false for season RAPM.
 * Use this cache for the average row's Net / Off Net / Def Net from season RAPM.
 */
export function buildSeasonRapmCache(
  games: SeasonMatchupPerGame[],
  commonParams: CommonFilterParams,
  avgEfficiency: number,
): GameStatsCache | null {
  if (games.length === 0) return null;
  const g0 = games[0];
  const team = commonParams.team || "";
  const teamStatsBaseline = (
    g0 as SeasonMatchupPerGame & { teamStatsBaseline?: any }
  ).teamStatsBaseline;
  const rosterStatsBaseline = (
    g0 as SeasonMatchupPerGame & { rosterStatsBaseline?: any[] }
  ).rosterStatsBaseline;
  const rosterInfo = (
    g0 as SeasonMatchupPerGame & { rosterInfo?: Record<string, any> }
  ).rosterInfo;
  const seasonTeam =
    teamStatsBaseline && _.size(teamStatsBaseline) > 0
      ? teamStatsBaseline
      : g0.teamStats && _.size(g0.teamStats) > 0
        ? g0.teamStats
        : emptyTeam;
  const seasonRoster =
    Array.isArray(rosterStatsBaseline) && rosterStatsBaseline.length > 0
      ? rosterStatsBaseline
      : Array.isArray(g0.rosterStats)
        ? g0.rosterStats
        : [];
  const mergedLineups = games.flatMap((g) =>
    Array.isArray((g.lineupStats as any)?.lineups)
      ? (g.lineupStats as any).lineups
      : [],
  );
  if (mergedLineups.length === 0) return null;
  const luckConfig: LuckParams = { base: ParamDefaults.defaultLuckConfig.base };
  const adjustForLuck = false;
  const teamStats: TeamStatsModel = {
    on: emptyTeam,
    off: emptyTeam,
    other: [],
    baseline: seasonTeam as any,
    global: { ...(seasonTeam as any), roster: rosterInfo ?? {} },
  };
  const rosterStats: RosterStatsModel = {
    on: [],
    off: [],
    other: [],
    baseline: seasonRoster as any,
    global: seasonRoster as any,
  };
  const lineupStats: LineupStatsModel = { lineups: mergedLineups };
  return GameAnalysisUtils.buildGameRapmStats(
    team,
    commonParams,
    lineupStats,
    teamStats,
    rosterStats,
    adjustForLuck,
    luckConfig,
    avgEfficiency,
    false, // singleGameMode = false for season RAPM
  );
}

/**
 * Cheap: given per-game RAPM caches, build impact rows for one player using
 * only RatingUtils.buildNetPoints (no buildGameRapmStats). Call after
 * buildPerGameRapmCaches when switching player or scale/Adj.
 */
export function buildGameImpactRowsFromCaches(
  perGameCaches: GameStatsCache[],
  games: SeasonMatchupPerGame[],
  playerCode: string,
  avgEfficiency: number,
  scaleType: "P%" | "T%" | "/G",
  adjBreakdownForSoS: boolean,
): GameImpactRow[] {
  const n = Math.min(perGameCaches.length, games.length);
  const rows: GameImpactRow[] = [];
  const isTeam = playerCode === SEASON_MATCHUP_TEAM_KEY;

  for (let i = 0; i < n; i++) {
    const g = games[i];
    const cache = perGameCaches[i];
    const enrichedPlayers = cache.rapmInfo?.enrichedPlayers ?? [];

    if (isTeam) {
      const playerRows: GameImpactRow[] = [];
      for (const enriched of enrichedPlayers) {
        const statObj = cache.playerInfo[enriched.playerId];
        if (!statObj) continue;
        // Only include players with full diagnostics so buildOnePlayerGameRow returns /G-scaled
        // net points; otherwise it returns raw per-100 RAPM and the Team sum would be wrong.
        const hasDiag =
          !!(statObj as any).diag_off_rtg && !!(statObj as any).diag_def_rtg;
        if (!hasDiag) continue;
        playerRows.push(
          buildOnePlayerGameRow(
            g,
            cache,
            enriched,
            statObj,
            avgEfficiency,
            scaleType,
            adjBreakdownForSoS,
          ),
        );
      }
      if (playerRows.length === 0) {
        const emptyRow: GameImpactRow = {
          gameLabel: g.gameLabel,
          gameInfo: g.gameInfo as Record<string, unknown>,
          title: g.gameLabel,
          team_poss_pct: ZERO_CELL,
        };
        rows.push(emptyRow);
      } else {
        const asRecords = playerRows.map(gameImpactRowToTotalRowInput);
        const possPerGame = getPossPerGame(g);
        const totalFromUtil = buildTotalRow(
          asRecords,
          possPerGame,
          avgEfficiency,
          scaleType,
        );
        const avgTeamPossPct =
          _.sumBy(playerRows, (r) => r.team_poss_pct?.value ?? 0) /
          playerRows.length;
        rows.push(totalRowToGameImpactRow(totalFromUtil, g, avgTeamPossPct));
      }
      continue;
    }

    const enriched = enrichedPlayers.find(
      (p) => p.playerCode === playerCode || p.playerId === playerCode,
    );
    const statObj = enriched ? cache.playerInfo[enriched.playerId] : undefined;

    if (!enriched || !statObj) {
      rows.push({
        gameLabel: g.gameLabel,
        gameInfo: g.gameInfo as Record<string, unknown>,
        title: g.gameLabel,
        team_poss_pct: ZERO_CELL,
      });
    } else {
      rows.push(
        buildOnePlayerGameRow(
          g,
          cache,
          enriched,
          statObj,
          avgEfficiency,
          scaleType,
          adjBreakdownForSoS,
        ),
      );
    }
  }

  return rows;
}

/**
 * Get stats + onOffStats + posInfo for one player in one game (for tooltip).
 * Returns null if player not in that game's cache.
 */
export function getPlayerTooltipDataForGame(
  cache: GameStatsCache,
  playerCode: string,
): {
  stats: IndivStatSet;
  onOffStats: PlayerOnOffStats;
  posInfo: IndivPosInfo;
} | null {
  const enriched = cache.rapmInfo?.enrichedPlayers?.find(
    (p) => p.playerCode === playerCode || p.playerId === playerCode,
  );
  if (!enriched) return null;
  const stats = cache.playerInfo[enriched.playerId];
  const posInfo = cache.positionInfo?.[enriched.playerId];
  if (!stats) return null;
  return {
    stats,
    onOffStats: enriched,
    posInfo: posInfo ?? ({} as IndivPosInfo),
  };
}

/**
 * Aggregate stats across games for one player for season-level tooltip.
 * Sets game_info to array of length numGames so tooltip per-game math is correct.
 */
export function getPlayerSeasonTooltipData(
  caches: GameStatsCache[],
  playerCode: string,
  numGames: number,
): {
  stats: IndivStatSet;
  onOffStats: PlayerOnOffStats;
  posInfo: IndivPosInfo;
} | null {
  const items: { stats: IndivStatSet; onOffStats: PlayerOnOffStats }[] = [];
  let posInfo: IndivPosInfo = {} as IndivPosInfo;
  for (const cache of caches) {
    const data = getPlayerTooltipDataForGame(cache, playerCode);
    if (!data) continue;
    items.push({ stats: data.stats, onOffStats: data.onOffStats });
    if (Object.keys(data.posInfo).length) posInfo = data.posInfo;
  }
  if (items.length === 0) return null;
  const first = items[0].stats as Record<string, unknown>;
  const aggregated: Record<string, unknown> = {};
  for (const key of Object.keys(first)) {
    const v = first[key];
    if (
      v &&
      typeof v === "object" &&
      "value" in v &&
      typeof (v as any).value === "number"
    ) {
      let sum = 0;
      for (const { stats: s } of items) {
        const o = (s as Record<string, unknown>)[key];
        if (o && typeof o === "object" && "value" in o)
          sum += (o as any).value ?? 0;
      }
      aggregated[key] = { value: sum };
    } else {
      aggregated[key] = v;
    }
  }
  aggregated.game_info = Array(numGames);
  let offSum = 0;
  let defSum = 0;
  for (const { onOffStats } of items) {
    offSum += onOffStats.rapm?.off_adj_ppp?.value ?? 0;
    defSum += onOffStats.rapm?.def_adj_ppp?.value ?? 0;
  }
  const n = items.length;
  const avgOnOff: PlayerOnOffStats = {
    ...items[0].onOffStats,
    rapm: {
      ...items[0].onOffStats.rapm,
      off_adj_ppp: { value: offSum / n },
      def_adj_ppp: { value: defSum / n },
    } as any,
  };
  return {
    stats: aggregated as IndivStatSet,
    onOffStats: avgOnOff,
    posInfo,
  };
}

/** Build one GameImpactRow as the "Average (N game(s))" row. */
export function buildAverageImpactRow(
  perGameCaches: GameStatsCache[],
  games: SeasonMatchupPerGame[],
  impacts: GameImpactRow[],
  playerCode: string,
  scaleType: "P%" | "T%" | "/G",
  seasonCache?: GameStatsCache | null,
): GameImpactRow {
  const n = Math.min(impacts.length, games.length, perGameCaches.length);
  if (n === 0) {
    return {
      gameLabel: "",
      gameInfo: {},
      title: `Average (0 games)`,
      team_poss_pct: ZERO_CELL,
    };
  }
  const cv = (v: number) => ({ value: v });
  const rs = (a: number, b: number) => (b !== 0 ? a / b : 0);

  const played = (imp: GameImpactRow) =>
    (imp.off_team_poss_pct?.value ?? 0) > 0 ||
    (imp.def_team_poss_pct?.value ?? 0) > 0;
  const playedIndices = _.range(0, n).filter((i) => played(impacts[i]));
  const gamesPlayedByPlayer = playedIndices.length;
  const totalGames = n;
  const missingGamesFactor = totalGames / (gamesPlayedByPlayer || 1);

  const impactsPlayed = playedIndices.map((i) => impacts[i]);

  // Baseline team poss (raw) for /G scaling (over all games)
  let sumOffPossPlayed = 0;
  let sumDefPossPlayed = 0;

  for (let i = 0; i < n; i++) {
    const g = games[i];
    const imp = impacts[i];
    const possPerGame = getPossPerGame(g);
    const offRaw = possPerGame ? possPerGame[0] * 100 : 0;
    const defRaw = possPerGame ? possPerGame[1] * 100 : 0;
    const offPossPct = imp.off_team_poss_pct?.value ?? 0;
    const defPossPct = imp.def_team_poss_pct?.value ?? 0;
    if (played(imp)) {
      sumOffPossPlayed += offRaw * offPossPct;
      sumDefPossPlayed += defRaw * defPossPct;
    }
  }

  const dataKeys = IMPACT_DECOMP_DATA_COL_KEYS;
  const avgCells: Record<string, Statistic> = {};
  for (const key of dataKeys) {
    const getVal = (r: GameImpactRow) =>
      (r[key as keyof GameImpactRow] as Statistic)?.value ?? 0;
    const sum = _.sumBy(impactsPlayed, getVal);
    avgCells[key] = cv(rs(sum, gamesPlayedByPlayer || 1));
  }
  avgCells["diff_adj_rapm"] = cv(
    (avgCells["off_adj_rapm"]?.value ?? 0) +
      (avgCells["def_adj_rapm"]?.value ?? 0),
  );
  const avgTeamPossPct =
    gamesPlayedByPlayer > 0
      ? _.sumBy(impactsPlayed, (r) => r.team_poss_pct?.value ?? 0) /
        gamesPlayedByPlayer
      : 0;
  avgCells["team_poss_pct"] = cv(avgTeamPossPct);

  if (seasonCache) {
    let offNet: number = 0;
    let defNet: number = 0;

    const enriched = seasonCache.rapmInfo?.enrichedPlayers?.find(
      (p) => p.playerCode === playerCode || p.playerId === playerCode,
    );
    const offRapm = enriched?.rapm?.off_adj_ppp?.value ?? 0;
    const defRapmRaw = enriched?.rapm?.def_adj_ppp?.value ?? 0;
    const defRapm = -defRapmRaw; // dNet flips sign vs RAPM (good defense = positive dNet)
    const seasonPlayer = enriched
      ? seasonCache.playerInfo?.[enriched.playerId]
      : undefined;
    const seasonOffPossPct =
      (seasonPlayer?.off_team_poss_pct as { value?: number })?.value ?? 0;
    const seasonDefPossPct =
      (seasonPlayer?.def_team_poss_pct as { value?: number })?.value ?? 0;

    if (scaleType === "P%") {
      offNet = offRapm;
      defNet = defRapm;
    } else if (scaleType === "T%") {
      offNet = offRapm * seasonOffPossPct * missingGamesFactor;
      defNet = defRapm * seasonDefPossPct * missingGamesFactor;
    } else {
      offNet = (offRapm * sumOffPossPlayed * 0.01) / (gamesPlayedByPlayer || 1);
      defNet = (defRapm * sumDefPossPlayed * 0.01) / (gamesPlayedByPlayer || 1);
    }
    const avgPossPct = (seasonOffPossPct + seasonDefPossPct) * 50;
    if (avgCells["team_poss_pct"]) {
      avgCells["team_poss_pct"].extraInfo =
        `Per game average. Over the season, aka weighted game average, use [${(
          avgPossPct * missingGamesFactor
        ).toFixed(
          1,
        )}%] (games appeared) or [${avgPossPct.toFixed(1)}%] (total))`;
    }
    if (avgCells["diff_adj_rapm"]) {
      avgCells["diff_adj_rapm"].extraInfo =
        `Average of per game values. Over the season (more accurate), use [${(offNet + defNet).toFixed(2)}]`;
    }
    if (avgCells["off_adj_rapm"]) {
      avgCells["off_adj_rapm"].extraInfo =
        `Average of per game values. Over the season (more accurate), use [${offNet.toFixed(2)}]`;
    }
    if (avgCells["def_adj_rapm"]) {
      avgCells["def_adj_rapm"].extraInfo =
        `Average of per game values. Over the season (more accurate), use [${defNet.toFixed(2)}]`;
    }
  }

  const title = `Average (${n} game${n !== 1 ? "s" : ""})`;
  return {
    gameLabel: title,
    gameInfo: {},
    title,
    off_team_poss_pct: cv(avgTeamPossPct),
    def_team_poss_pct: cv(avgTeamPossPct),
    ...avgCells,
  } as GameImpactRow;
}

function weightedAvg(
  rows: GameImpactRow[],
  getVal: (r: GameImpactRow) => number,
  weights: number[],
): number {
  let sum = 0;
  let wSum = 0;
  for (let i = 0; i < rows.length; i++) {
    const w = weights[i] ?? 0;
    sum += getVal(rows[i]) * w;
    wSum += w;
  }
  return wSum !== 0 ? sum / wSum : 0;
}

/**
 * Build table row data (record of field keys → { value } or ReactNode) for impactDecompTable.
 * If options are provided, prepends an "Average (N game(s))" row.
 */
export function buildGameImpactTableRows(
  perGameImpacts: GameImpactRow[],
  options?: {
    games: SeasonMatchupPerGame[];
    scaleType: "P%" | "T%" | "/G";
    perGameCaches: GameStatsCache[];
    playerCode: string;
    seasonCache?: GameStatsCache | null;
  },
): Record<string, Statistic | string | undefined>[] {
  const toTableRecord = (row: GameImpactRow) => ({
    title: row.title,
    team_poss_pct: row.team_poss_pct,
    diff_adj_rapm: row.diff_adj_rapm,
    off_adj_rapm: row.off_adj_rapm,
    def_adj_rapm: row.def_adj_rapm,
    off_sos_bonus: row.off_sos_bonus,
    off_gravity_bonus: row.off_gravity_bonus,
    off_net_3p: row.off_net_3p,
    off_net_mid: row.off_net_mid,
    off_net_rim: row.off_net_rim,
    off_net_ft: row.off_net_ft,
    off_net_ast: row.off_net_ast,
    off_net_to: row.off_net_to,
    off_net_orb: row.off_net_orb,
    def_sos_bonus: row.def_sos_bonus,
    def_gravity_bonus: row.def_gravity_bonus,
  });
  if (!options || options.playerCode === SEASON_MATCHUP_TEAM_KEY) {
    return perGameImpacts.map(toTableRecord);
  }
  const averageRow = buildAverageImpactRow(
    options.perGameCaches,
    options.games,
    perGameImpacts,
    options.playerCode,
    options.scaleType,
    options.seasonCache,
  );
  return [toTableRecord(averageRow), ...perGameImpacts.map(toTableRecord)];
}
