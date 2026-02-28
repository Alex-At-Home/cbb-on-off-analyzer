/**
 * Helpers for Season Matchup Analyzer: build game query strings and request params
 * from a game list. No changes to existing utils.
 */
import _ from "lodash";
import { GameInfoStatSet } from "./StatModels";
import { QueryWithFilters, CommonFilterParams } from "./FilterModels";
import { QueryUtils } from "./QueryUtils";

/** Extract team id from GameInfoStatSet.opponent (e.g. "A:Duke" -> "Duke"). */
function opponentTeamFromGame(gameInfo: GameInfoStatSet): string {
  const raw = (gameInfo.opponent as string) || "";
  return raw.replace(/^[AHN]:/, "").trim() || "Unknown";
}

/** Build one game query string for ES (opponent.team + date). */
export function buildGameQueryString(gameInfo: GameInfoStatSet): string {
  const team = opponentTeamFromGame(gameInfo);
  const date = (gameInfo.date as string) || "????-??-??";
  return `opponent.team:"${team}" AND date:(${date})`;
}

/** Build game label for display (same format as MatchupFilter buildMenuItem). */
export function buildGameLabel(gameInfo: GameInfoStatSet): string {
  const oppoAndLocation = ((gameInfo.opponent as string) || "?:Unknown")
    .replace(/^A:/, "@ ")
    .replace(/^H:/, "")
    .replace(/^N:/, "vs ");
  const date = (gameInfo.date as string) || "????-??-??";
  return `${oppoAndLocation} (${date})`;
}

/** QueryFilters string for a single game (for MatchupAnalyzer link). */
export function getMatchupQueryFiltersForGame(
  gameInfo: GameInfoStatSet,
): string {
  const date = (gameInfo.date as string) || "????-??-??";
  const raw = (gameInfo.opponent as string) || "";
  const location = raw.startsWith("A:")
    ? "Away"
    : raw.startsWith("H:")
      ? "Home"
      : "Neutral";
  const opponent = opponentTeamFromGame(gameInfo);
  const sel = QueryUtils.buildGameSelectionFilter([
    { date, location, opponent, score: "" },
  ]);
  return QueryUtils.buildFilterStr([sel]);
}

/**
 * From game list, build query strings and params for team/player APIs (on/off/other)
 * and for lineup API (otherQueries = all games).
 */
export function buildGameRequestParams(
  games: GameInfoStatSet[],
  commonParams: CommonFilterParams,
): {
  gameQueries: string[];
  teamPlayerParams: CommonFilterParams & {
    baseQuery?: string;
    onQuery?: string;
    offQuery?: string;
    otherQueries?: QueryWithFilters[];
  };
  lineupParams: CommonFilterParams & { otherQueries?: QueryWithFilters[] };
} {
  const gameQueries = games.map((g) => buildGameQueryString(g));
  const baseQuery = "";

  const teamPlayerParams = {
    ...commonParams,
    baseQuery,
    onQuery: gameQueries[0] ?? "",
    offQuery: gameQueries[1] ?? "",
    otherQueries:
      gameQueries.length > 2
        ? gameQueries.slice(2).map((q) => ({ query: q }) as QueryWithFilters)
        : undefined,
  };

  const lineupParams = {
    ...commonParams,
    baseQuery,
    otherQueries: _.isEmpty(gameQueries)
      ? undefined
      : gameQueries.map((q) => ({ query: q }) as QueryWithFilters),
  };

  return { gameQueries, teamPlayerParams, lineupParams };
}
