/**
 * Per-game impact and table row builders for Season Matchup Analyzer.
 * New file — no changes to existing utils.
 */
import { CommonFilterParams } from "./FilterModels";
import { SeasonMatchupPerGame } from "../components/SeasonMatchupFilter";

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

/**
 * Compute per-game impact for one player. Returns one row per game.
 * Stub: returns zeros; can be wired to RatingUtils/GameAnalysisUtils per game later.
 */
export function computeNetRatingPerGame(
  _playerCode: string,
  games: SeasonMatchupPerGame[],
  _commonParams: CommonFilterParams,
  _avgEfficiency: number
): GameImpactRow[] {
  return games.map((g) => ({
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
  }));
}

/**
 * Build table row data (record of field keys → { value } or ReactNode) for impactDecompTable.
 */
export function buildGameImpactTableRows(
  perGameImpacts: GameImpactRow[]
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
