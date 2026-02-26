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
import { RatingUtils } from "./stats/RatingUtils";

const debugMode = false;

export type GameImpactRow = {
  gameLabel: string;
  gameInfo: Record<string, unknown>;
  title: string;
  team_poss_pct: { value: number };
  diff_adj_rapm: { value: number };
  off_adj_rapm: { value: number };
  def_adj_rapm: { value: number };
  off_sos_bonus: { value: number };
  off_gravity_bonus: { value: number };
  off_net_3p: { value: number };
  off_net_mid: { value: number };
  off_net_rim: { value: number };
  off_net_ft: { value: number };
  off_net_ast: { value: number };
  off_net_to: { value: number };
  off_net_orb: { value: number };
  def_sos_bonus: { value: number };
  def_gravity_bonus: { value: number };
};

const ZERO_CELL = { value: 0 };
const emptyTeam = StatModels.emptyTeam();

/** Option value for "Team" (sum of all players) in the quick toggles. */
export const SEASON_MATCHUP_TEAM_KEY = "Team";

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

  const teamStats: TeamStatsModel = {
    on: emptyTeam,
    off: emptyTeam,
    other: [],
    baseline: teamBucket as any,
    global: teamBucket as any,
  };
  const rosterStats: RosterStatsModel = {
    on: [],
    off: [],
    other: [],
    baseline: playerBuckets as any,
    global: playerBuckets as any,
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
  const offRapm = enriched?.rapm?.off_adj_ppp?.value ?? 0;
  const defRapm = enriched?.rapm?.def_adj_ppp?.value ?? 0;
  const offPoss = (statObj?.off_team_poss_pct as any)?.value ?? 0;
  const defPoss = (statObj?.def_team_poss_pct as any)?.value ?? 0;
  const possPct = 0.5 * offPoss + 0.5 * defPoss;
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
      diff_adj_rapm: { value: netPoints.offNetPts - netPoints.defNetPts - offSosAdj - defSosAdj },
      off_adj_rapm: { value: netPoints.offNetPts - offSosAdj },
      def_adj_rapm: { value: -netPoints.defNetPts - defSosAdj },
      off_sos_bonus: { value: netPoints.offNetPtsSos },
      off_gravity_bonus: { value: netPoints.offNetPtsWowy + netPoints.offNetPtsVolume },
      off_net_3p: { value: netPoints.offNetPts3P },
      off_net_mid: { value: netPoints.offNetPtsMid },
      off_net_rim: { value: netPoints.offNetPtsRim },
      off_net_ft: { value: netPoints.offNetPtsFt },
      off_net_ast: { value: offNetAst },
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
    diff_adj_rapm: { value: offRapm - defRapm },
    off_adj_rapm: { value: offRapm },
    def_adj_rapm: { value: defRapm },
    off_sos_bonus: ZERO_CELL,
    off_gravity_bonus: ZERO_CELL,
    off_net_3p: ZERO_CELL,
    off_net_mid: ZERO_CELL,
    off_net_rim: ZERO_CELL,
    off_net_ft: ZERO_CELL,
    off_net_ast: ZERO_CELL,
    off_net_to: ZERO_CELL,
    off_net_orb: ZERO_CELL,
    def_sos_bonus: ZERO_CELL,
    def_gravity_bonus: ZERO_CELL,
  };
}

/** Sum numeric .value fields of multiple rows into one row. */
function sumImpactRows(rows: GameImpactRow[], template: GameImpactRow): GameImpactRow {
  if (rows.length === 0) return template;
  const sum = { ...template };
  for (const key of NUMERIC_KEYS) {
    (sum as any)[key] = { value: 0 };
  }
  for (const row of rows) {
    for (const key of NUMERIC_KEYS) {
      (sum as any)[key].value += (row[key] as { value: number }).value;
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
        playerRows.push(
          buildOnePlayerGameRow(g, cache, enriched, statObj, avgEfficiency, scaleType, adjBreakdownForSoS),
        );
      }
      const template: GameImpactRow = {
        gameLabel: g.gameLabel,
        gameInfo: g.gameInfo as Record<string, unknown>,
        title: g.gameLabel,
        team_poss_pct: ZERO_CELL,
        diff_adj_rapm: ZERO_CELL,
        off_adj_rapm: ZERO_CELL,
        def_adj_rapm: ZERO_CELL,
        off_sos_bonus: ZERO_CELL,
        off_gravity_bonus: ZERO_CELL,
        off_net_3p: ZERO_CELL,
        off_net_mid: ZERO_CELL,
        off_net_rim: ZERO_CELL,
        off_net_ft: ZERO_CELL,
        off_net_ast: ZERO_CELL,
        off_net_to: ZERO_CELL,
        off_net_orb: ZERO_CELL,
        def_sos_bonus: ZERO_CELL,
        def_gravity_bonus: ZERO_CELL,
      };
      rows.push(sumImpactRows(playerRows, template));
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
        diff_adj_rapm: ZERO_CELL,
        off_adj_rapm: ZERO_CELL,
        def_adj_rapm: ZERO_CELL,
        off_sos_bonus: ZERO_CELL,
        off_gravity_bonus: ZERO_CELL,
        off_net_3p: ZERO_CELL,
        off_net_mid: ZERO_CELL,
        off_net_rim: ZERO_CELL,
        off_net_ft: ZERO_CELL,
        off_net_ast: ZERO_CELL,
        off_net_to: ZERO_CELL,
        off_net_orb: ZERO_CELL,
        def_sos_bonus: ZERO_CELL,
        def_gravity_bonus: ZERO_CELL,
      });
    } else {
      rows.push(
        buildOnePlayerGameRow(g, cache, enriched, statObj, avgEfficiency, scaleType, adjBreakdownForSoS),
      );
    }
  }

  return rows;
}

/**
 * Build table row data (record of field keys → { value } or ReactNode) for impactDecompTable.
 */
export function buildGameImpactTableRows(
  perGameImpacts: GameImpactRow[],
): Record<string, { value: number } | string>[] {
  return perGameImpacts.map((row) => ({
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
  }));
}
